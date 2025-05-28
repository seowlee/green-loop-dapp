"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Contract ABIs
import GreenTokenABI from "../../abis/GreenToken.json";
import RewardTokenABI from "../../abis/RewardToken.json";
import GreenLoopABI from "../../abis/GreenLoop.json";

// Contract Addresses
const GREEN_TOKEN_ADDRESS = "0x2546149db25CC3906BF4baBd922a26244ACaa24c";
const REWARD_TOKEN_ADDRESS = "0x6d555736e8b16923976CbBF8a707d94F0Df9F712";
const GREEN_LOOP_ADDRESS = "0xFe4EBD818469f6999eae9E3d0e0F8A7A01f5fbEe";

interface SwapHistory {
  timestamp: number;
  grnAmount: ethers.BigNumber;
  rwdAmount: ethers.BigNumber;
}

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum: EthereumProvider;
  }
}

export default function Home() {
  // 상태 관리
  const [account, setAccount] = useState<string>(""); // 현재 연결된 지갑 주소
  const [grnBalance, setGrnBalance] = useState<string>("0"); // GRN 토큰 잔액
  const [rwdBalance, setRwdBalance] = useState<string>("0"); // RWD 토큰 잔액
  const [swapAmount, setSwapAmount] = useState<string>(""); // 스왑할 GRN 수량
  const [rewardAmount, setRewardAmount] = useState<string>("0"); // 받을 RWD 수량
  const [isOwner, setIsOwner] = useState<boolean>(false); // 관리자 여부
  const [swapHistory, setSwapHistory] = useState<SwapHistory[]>([]); // 스왑 이력
  const [newSwapRate, setNewSwapRate] = useState<string>(""); // 새로운 스왑 비율
  const [transferAmount, setTransferAmount] = useState<string>(""); // 전송할 GRN 수량
  const [approveAmount, setApproveAmount] = useState<string>(""); // 허용할 GRN 수량
  const [allowance, setAllowance] = useState<string>("0"); // 현재 허용량
  const [rwdTransferAmount, setRwdTransferAmount] = useState<string>(""); // 전송할 RWD 수량
  const [balanceCheckAddress, setBalanceCheckAddress] = useState<string>(""); // 잔액 확인할 주소
  const [checkedBalances, setCheckedBalances] = useState<{
    grn: string;
    rwd: string;
  }>({ grn: "0", rwd: "0" }); // 확인된 잔액
  const [currentSwapRate, setCurrentSwapRate] = useState<string>("0"); // 현재 스왑 비율
  const [currentPage, setCurrentPage] = useState<number>(1); // 현재 스왑 이력 페이지
  const itemsPerPage = 5; // 페이지당 항목 수

  // 테스트 계정 주소
  const TEST_ACCOUNTS = {
    admin: "0x46b1a125170e5F3892A056993077F9Df04A70d3E",
    user: "0xfF6106390e78fB675C1c0AA0079292f8C2C96D3F",
    greenLoop: GREEN_LOOP_ADDRESS,
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        const connectedAccount = accounts[0];
        setAccount(connectedAccount);
        console.log("accountsChanged: 계정 변경됨 to", connectedAccount);

        loadBalances(connectedAccount);
        checkOwner(connectedAccount);
        loadSwapHistory();
        checkAllowance();
        checkSwapRate();
      } else {
        console.log("accountsChanged: 계정 연결 해제됨");
        setAccount("");
        setGrnBalance("0");
        setRwdBalance("0");
        setIsOwner(false);
        setSwapHistory([]);
        setAllowance("0");
        setCheckedBalances({ grn: "0", rwd: "0" });
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  // 지갑 연결 확인
  const checkIfWalletIsConnected = async () => {
    try {
      console.log("기존 지갑 연결 확인 중...");
      if (!window.ethereum) {
        console.log("MetaMask가 설치되어 있지 않습니다.");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      console.log("checkIfWalletIsConnected: 현재 연결된 계정:", accounts);

      if (accounts.length !== 0) {
        const connectedAccount = accounts[0];
        setAccount(connectedAccount);
        console.log(
          "checkIfWalletIsConnected: 계정 설정 완료:",
          connectedAccount
        );

        await loadBalances(connectedAccount);
        await checkOwner(connectedAccount);
        await loadSwapHistory();
        await checkAllowance();
        await checkSwapRate();

        console.log("기존 연결 복원 완료");
      } else {
        console.log("연결된 계정이 없습니다.");
        setAccount("");
        setGrnBalance("0");
        setRwdBalance("0");
        setIsOwner(false);
        setSwapHistory([]);
        setAllowance("0");
        setCheckedBalances({ grn: "0", rwd: "0" });
      }
    } catch (error) {
      console.error("지갑 연결 확인 중 오류 발생:", error);
    }
  };

  // 지갑 연결
  const connectWallet = async () => {
    try {
      console.log("지갑 연결 시도...");
      if (!window.ethereum) {
        alert("MetaMask를 설치해주세요!");
        return;
      }

      console.log("connectWallet: MetaMask 요청 중...");
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
        params: [],
      });

      console.log("connectWallet: 연결된 계정:", accounts);
      if (accounts.length === 0) {
        alert("계정을 찾을 수 없습니다.");
        return;
      }

      const connectedAccount = accounts[0];
      setAccount(connectedAccount);
      console.log("connectWallet: 계정 설정 완료:", connectedAccount);

      await loadBalances(connectedAccount);
      await checkOwner(connectedAccount);
      await loadSwapHistory();
      await checkAllowance();
      await checkSwapRate();

      console.log("모든 데이터 로드 완료");
    } catch (error) {
      console.error("지갑 연결 중 오류 발생:", error);
      alert("지갑 연결 중 오류가 발생했습니다: " + (error as Error).message);
    }
  };

  // 잔액 로드
  const loadBalances = async (address: string) => {
    if (
      !address ||
      !ethers.utils.isAddress(address) ||
      !GREEN_TOKEN_ADDRESS ||
      !ethers.utils.isAddress(GREEN_TOKEN_ADDRESS) ||
      !REWARD_TOKEN_ADDRESS ||
      !ethers.utils.isAddress(REWARD_TOKEN_ADDRESS)
    ) {
      setGrnBalance("0");
      setRwdBalance("0");
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const greenToken = new ethers.Contract(
        GREEN_TOKEN_ADDRESS,
        GreenTokenABI,
        provider
      );
      const rewardToken = new ethers.Contract(
        REWARD_TOKEN_ADDRESS,
        RewardTokenABI,
        provider
      );

      const grnBalance = await greenToken.balanceOf(address);
      const rwdBalance = await rewardToken.balanceOf(address);

      setGrnBalance(ethers.utils.formatEther(grnBalance));
      setRwdBalance(ethers.utils.formatEther(rwdBalance));
    } catch (error) {
      console.error(error);
      setGrnBalance("0");
      setRwdBalance("0");
    }
  };

  // 관리자 여부 확인
  const checkOwner = async (address: string) => {
    if (
      !address ||
      !ethers.utils.isAddress(address) ||
      !GREEN_LOOP_ADDRESS ||
      !ethers.utils.isAddress(GREEN_LOOP_ADDRESS)
    ) {
      setIsOwner(false);
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const greenLoop = new ethers.Contract(
        GREEN_LOOP_ADDRESS,
        GreenLoopABI,
        provider
      );
      const owner = await greenLoop.owner();
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
    } catch (error) {
      console.error(error);
      setIsOwner(false);
    }
  };

  // 스왑 이력 로드
  const loadSwapHistory = async () => {
    if (
      !account ||
      !ethers.utils.isAddress(account) ||
      !GREEN_LOOP_ADDRESS ||
      !ethers.utils.isAddress(GREEN_LOOP_ADDRESS)
    ) {
      console.log("loadSwapHistory: 유효하지 않은 계정 또는 컨트랙트 주소");
      setSwapHistory([]);
      return;
    }
    try {
      console.log(`loadSwapHistory: 계정 ${account}의 스왑 이력 로드 시도...`);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const greenLoop = new ethers.Contract(
        GREEN_LOOP_ADDRESS,
        GreenLoopABI,
        provider
      );

      const history = await greenLoop.getSwapHistory(account);
      console.log("loadSwapHistory: 불러온 이력 데이터:", history);

      // 최신 이력 먼저 표시 (역순 정렬)
      const reversedHistory = [...history].reverse();
      setSwapHistory(reversedHistory);
    } catch (error) {
      console.error("loadSwapHistory 오류:", error);
      setSwapHistory([]);
    }
  };

  // 보상 수량 계산
  const calculateReward = async (amount: string) => {
    if (
      !amount ||
      parseFloat(amount) <= 0 ||
      !GREEN_LOOP_ADDRESS ||
      !ethers.utils.isAddress(GREEN_LOOP_ADDRESS)
    ) {
      setRewardAmount("0");
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const greenLoop = new ethers.Contract(
        GREEN_LOOP_ADDRESS,
        GreenLoopABI,
        provider
      );
      const rate = await greenLoop.swapRate();
      // Note: Assuming both tokens have 18 decimals for simplicity
      const reward = ethers.utils
        .parseEther(amount)
        .mul(rate)
        .div(ethers.utils.parseEther("1"));
      setRewardAmount(ethers.utils.formatEther(reward));
    } catch (error) {
      console.error(error);
      setRewardAmount("0");
    }
  };

  // GRN 토큰 전송 (관리자 → 사용자)
  const handleTransferTokens = async (toAddress: string) => {
    if (!account || !ethers.utils.isAddress(account)) {
      alert("지갑을 먼저 연결해주세요.");
      return;
    }
    if (!toAddress || !ethers.utils.isAddress(toAddress)) {
      alert("유효한 받는 주소를 입력해주세요.");
      return;
    }
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      alert("유효한 전송 수량을 입력해주세요.");
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const greenToken = new ethers.Contract(
        GREEN_TOKEN_ADDRESS,
        GreenTokenABI,
        signer
      );

      const amount = ethers.utils.parseEther(transferAmount);
      const tx = await greenToken.transfer(toAddress, amount);
      alert("토큰 전송 트랜잭션이 전송되었습니다. 잠시만 기다려주세요...");
      await tx.wait();
      console.log("토큰 전송 트랜잭션 완료");

      // 전송 후 현재 계정(관리자)의 잔액만 다시 로드하여 상단 표시 업데이트
      await loadBalances(account);

      // 사용자 계정의 잔액은 '토큰 잔액 확인' 섹션에서 별도로 확인 가능

      setTransferAmount("");
      alert("토큰 전송이 완료되었습니다.");
    } catch (error) {
      const err = error as any;
      console.error("토큰 전송 중 오류 발생:", err);
      alert("토큰 전송 중 오류가 발생했습니다: " + (err as Error).message);
    }
  };

  // 현재 허용량 확인
  const checkAllowance = async () => {
    try {
      if (
        !account ||
        !ethers.utils.isAddress(account) ||
        !GREEN_LOOP_ADDRESS ||
        !ethers.utils.isAddress(GREEN_LOOP_ADDRESS) ||
        !GREEN_TOKEN_ADDRESS ||
        !ethers.utils.isAddress(GREEN_TOKEN_ADDRESS)
      ) {
        setAllowance("0");
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const greenToken = new ethers.Contract(
        GREEN_TOKEN_ADDRESS,
        GreenTokenABI,
        provider
      );

      const allowance = await greenToken.allowance(account, GREEN_LOOP_ADDRESS);
      const formattedAllowance = ethers.utils.formatEther(allowance);
      setAllowance(formattedAllowance);
      console.log("현재 allowance:", formattedAllowance);
    } catch (error) {
      console.error("checkAllowance 오류:", error);
      setAllowance("0");
    }
  };

  // GRN 토큰 허용량 설정
  const handleApprove = async () => {
    try {
      if (!account || !ethers.utils.isAddress(account)) {
        alert("지갑을 먼저 연결해주세요.");
        return;
      }
      if (!GREEN_LOOP_ADDRESS || !ethers.utils.isAddress(GREEN_LOOP_ADDRESS)) {
        alert("GreenLoop 컨트랙트 주소가 올바르지 않습니다.");
        return;
      }
      if (!approveAmount || parseFloat(approveAmount) <= 0) {
        alert("유효한 허용 수량을 입력해주세요.");
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const greenToken = new ethers.Contract(
        GREEN_TOKEN_ADDRESS,
        GreenTokenABI,
        signer
      );

      const amount = ethers.utils.parseEther(approveAmount);
      console.log("설정할 allowance:", approveAmount);

      const tx = await greenToken.approve(GREEN_LOOP_ADDRESS, amount);
      await tx.wait();

      await checkAllowance();
      setApproveAmount("");
      alert("허용량이 설정되었습니다.");
    } catch (error) {
      console.error(error);
      alert("허용량 설정 중 오류가 발생했습니다: " + (error as Error).message);
    }
  };

  // 계정 변경 시 허용량 자동 확인 (및 초기 로드 시)
  useEffect(() => {
    checkAllowance();
  }, [account]);

  // 계정 전환 버튼 안내
  const switchAccount = () => {
    alert(
      "MetaMask에서 계정을 전환한 후, 이 페이지를 새로고침하거나 잠시 기다려주세요."
    );
  };

  // 토큰 스왑 실행
  const handleSwap = async () => {
    try {
      if (!account || !ethers.utils.isAddress(account)) {
        alert("지갑 주소가 올바르지 않습니다.");
        return;
      }
      if (!GREEN_LOOP_ADDRESS || !ethers.utils.isAddress(GREEN_LOOP_ADDRESS)) {
        alert("GreenLoop 컨트랙트 주소가 올바르지 않습니다.");
        return;
      }
      if (!swapAmount || parseFloat(swapAmount) <= 0) {
        alert("유효한 GRN 수량을 입력해주세요.");
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const greenLoop = new ethers.Contract(
        GREEN_LOOP_ADDRESS,
        GreenLoopABI,
        signer
      );
      const greenToken = new ethers.Contract(
        GREEN_TOKEN_ADDRESS,
        GreenTokenABI,
        signer
      );

      const amount = ethers.utils.parseEther(swapAmount);

      // GRN 잔액 확인
      const grnBalance = await greenToken.balanceOf(account);
      if (grnBalance.lt(amount)) {
        alert("GRN 잔액이 부족합니다.");
        return;
      }

      // 스왑 전 allowance 확인
      const currentAllowance = await greenToken.allowance(
        account,
        GREEN_LOOP_ADDRESS
      );
      if (currentAllowance.lt(amount)) {
        alert("허용량이 부족합니다. 먼저 approve를 실행해주세요.");
        return;
      }

      // RWD 잔액 확인 (GreenLoop 컨트랙트의 RWD 잔액)
      const rewardToken = new ethers.Contract(
        REWARD_TOKEN_ADDRESS,
        RewardTokenABI,
        provider
      );
      const rwdBalance = await rewardToken.balanceOf(GREEN_LOOP_ADDRESS);
      const swapRate = await greenLoop.swapRate();
      const expectedRwd = amount
        .mul(swapRate)
        .div(ethers.utils.parseEther("1"));

      if (rwdBalance.lt(expectedRwd)) {
        alert("GreenLoop 컨트랙트의 RWD 잔액이 부족합니다.");
        return;
      }

      // 트랜잭션 시뮬레이션 (실패 원인 사전 확인)
      try {
        console.log("스왑 시뮬레이션 전 변수:", {
          account: account,
          greenLoopAddress: GREEN_LOOP_ADDRESS,
          swapAmount: ethers.utils.formatEther(amount),
          allowance: ethers.utils.formatEther(currentAllowance),
          greenBalance: ethers.utils.formatEther(grnBalance),
        });
        await greenLoop.estimateGas.swap(amount);
      } catch (simError) {
        const err = simError as any;
        // revert 메시지 최대한 상세하게 추출
        let revertMsg = err?.data?.message || err?.message;
        if (err?.error?.message) revertMsg = err.error.message; // Sometimes error details are nested differently
        if (err?.data?.data?.message) revertMsg = err.data.data.message;
        alert("스왑 트랜잭션이 실행될 수 없습니다: " + revertMsg);
        console.error("트랜잭션 시뮬레이션 실패:", err);
        return;
      }

      const tx = await greenLoop.swap(amount);
      console.log("트랜잭션 전송됨:", tx.hash);

      alert("스왑 트랜잭션이 전송되었습니다. 잠시만 기다려주세요...");
      await tx.wait();
      console.log("트랜잭션 완료");

      // 스왑 성공 후 잔액, 이력, 허용량 새로고침
      await loadBalances(account);
      await loadSwapHistory();
      await checkAllowance();
      setSwapAmount("");
      setRewardAmount("0");
      alert("스왑이 완료되었습니다!");
    } catch (error) {
      const err = error as any;
      console.error("스왑 오류:", err);
      if (err.code === "INSUFFICIENT_FUNDS") {
        alert("가스비가 부족합니다.");
      } else if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
        alert(
          "트랜잭션 실행에 실패했습니다. 잔액과 허용량을 다시 확인해주세요."
        );
      } else if (err.data && err.data.message) {
        alert("스왑 중 오류가 발생했습니다: " + err.data.message);
      } else if (err.message) {
        alert("스왑 중 오류가 발생했습니다: " + err.message);
      } else {
        alert("스왑 중 알 수 없는 오류가 발생했습니다.");
      }
    }
  };

  // 토큰 인출 (관리자 전용)
  const handleWithdraw = async () => {
    if (!account || !ethers.utils.isAddress(account) || !isOwner) {
      alert("관리자만 토큰을 인출할 수 있습니다.");
      return;
    }
    if (!GREEN_LOOP_ADDRESS || !ethers.utils.isAddress(GREEN_LOOP_ADDRESS)) {
      alert("GreenLoop 컨트랙트 주소가 올바르지 않습니다.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const greenLoop = new ethers.Contract(
        GREEN_LOOP_ADDRESS,
        GreenLoopABI,
        signer
      );

      const tx = await greenLoop.withdrawTokens(); // Note: withdrawTokens in contract requires token address and amount. This call might fail.
      await tx.wait();

      await loadBalances(account);
      alert("토큰 인출이 완료되었습니다.");
    } catch (error) {
      console.error(error);
      alert("토큰 인출 중 오류가 발생했습니다: " + (error as Error).message);
    }
  };

  // 스왑 비율 변경 (관리자 전용)
  const handleSetSwapRate = async () => {
    if (!account || !ethers.utils.isAddress(account) || !isOwner) {
      alert("관리자만 스왑 비율을 변경할 수 있습니다.");
      return;
    }
    if (!GREEN_LOOP_ADDRESS || !ethers.utils.isAddress(GREEN_LOOP_ADDRESS)) {
      alert("GreenLoop 컨트랙트 주소가 올바르지 않습니다.");
      return;
    }
    if (!newSwapRate || parseFloat(newSwapRate) <= 0) {
      alert("유효한 스왑 비율을 입력하세요.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const greenLoop = new ethers.Contract(
        GREEN_LOOP_ADDRESS,
        GreenLoopABI,
        signer
      );

      const rate = ethers.utils.parseEther(newSwapRate);
      const tx = await greenLoop.setSwapRate(rate);
      await tx.wait();

      await checkSwapRate();
      setNewSwapRate("");
      alert("스왑 비율이 변경되었습니다.");
    } catch (error) {
      console.error(error);
      alert(
        "스왑 비율 변경 중 오류가 발생했습니다: " + (error as Error).message
      );
    }
  };

  // RWD 토큰 전송 (관리자 → GreenLoop)
  const handleRwdTransfer = async () => {
    if (!account || !ethers.utils.isAddress(account) || !isOwner) {
      alert("관리자만 RWD 토큰을 전송할 수 있습니다.");
      return;
    }
    if (!GREEN_LOOP_ADDRESS || !ethers.utils.isAddress(GREEN_LOOP_ADDRESS)) {
      alert("GreenLoop 컨트랙트 주소가 올바르지 않습니다.");
      return;
    }
    if (!rwdTransferAmount || parseFloat(rwdTransferAmount) <= 0) {
      alert("유효한 전송 수량을 입력해주세요.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const rewardToken = new ethers.Contract(
        REWARD_TOKEN_ADDRESS,
        RewardTokenABI,
        signer
      );

      const amount = ethers.utils.parseEther(rwdTransferAmount);
      const tx = await rewardToken.transfer(GREEN_LOOP_ADDRESS, amount);
      await tx.wait();

      // 전송 후 잔액 업데이트
      await loadBalances(account);
      await checkBalances(GREEN_LOOP_ADDRESS); // GreenLoop 컨트랙트 잔액 확인
      setRwdTransferAmount("");
      alert("RWD 토큰 전송이 완료되었습니다.");
    } catch (error) {
      console.error(error);
      alert(
        "RWD 토큰 전송 중 오류가 발생했습니다: " + (error as Error).message
      );
    }
  };

  // 특정 주소의 토큰 잔액 확인
  const checkBalances = async (address: string) => {
    if (
      !address ||
      !ethers.utils.isAddress(address) ||
      !GREEN_TOKEN_ADDRESS ||
      !ethers.utils.isAddress(GREEN_TOKEN_ADDRESS) ||
      !REWARD_TOKEN_ADDRESS ||
      !ethers.utils.isAddress(REWARD_TOKEN_ADDRESS)
    ) {
      setCheckedBalances({ grn: "0", rwd: "0" });
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const greenToken = new ethers.Contract(
        GREEN_TOKEN_ADDRESS,
        GreenTokenABI,
        provider
      );
      const rewardToken = new ethers.Contract(
        REWARD_TOKEN_ADDRESS,
        RewardTokenABI,
        provider
      );

      const grnBalance = await greenToken.balanceOf(address);
      const rwdBalance = await rewardToken.balanceOf(address);

      setCheckedBalances({
        grn: ethers.utils.formatEther(grnBalance),
        rwd: ethers.utils.formatEther(rwdBalance),
      });
    } catch (error) {
      console.error("checkBalances 오류:", error);
      setCheckedBalances({ grn: "0", rwd: "0" });
    }
  };

  // 스왑 비율 확인
  const checkSwapRate = async () => {
    if (!GREEN_LOOP_ADDRESS || !ethers.utils.isAddress(GREEN_LOOP_ADDRESS)) {
      setCurrentSwapRate("0");
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const greenLoop = new ethers.Contract(
        GREEN_LOOP_ADDRESS,
        GreenLoopABI,
        provider
      );
      const rate = await greenLoop.swapRate();
      setCurrentSwapRate(ethers.utils.formatEther(rate));
    } catch (error) {
      console.error(error);
      setCurrentSwapRate("0");
    }
  };

  // 계정 변경 시 스왑 비율 확인 (및 초기 로드 시)
  useEffect(() => {
    checkSwapRate();
  }, [account]);

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-green-50 to-green-100">
      <div className="max-w-4xl mx-auto">
        {/* 헤더: 로고, 지갑 연결, 계정 정보 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Image
              src="/logo.png"
              alt="Green Loop Logo"
              width={50}
              height={50}
            />
            <h1 className="text-3xl font-bold text-green-800">Green Loop</h1>
          </div>
          {!account ? (
            <Button
              onClick={connectWallet}
              className="bg-green-600 hover:bg-green-700"
            >
              지갑 연결
            </Button>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-bold">
                  {isOwner ? "관리자" : "사용자"}
                </span>
                : {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              <Button
                onClick={switchAccount}
                className="bg-blue-600 hover:bg-blue-700"
              >
                계정 전환
              </Button>
            </div>
          )}
        </div>

        {/* 잔액 표시 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>GRN 잔액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {parseFloat(grnBalance).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{" "}
                GRN
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>RWD 잔액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {parseFloat(rwdBalance).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{" "}
                RWD
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 관리자 기능 */}
        {isOwner && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>관리자 기능</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* GRN 토큰 전송 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    GRN 전송 (관리자 → 사용자)
                  </label>
                  <div className="space-y-2">
                    {/* <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        to: {TEST_ACCOUNTS.user}
                      </span>
                    </div> */}
                    <Input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="전송할 GRN 수량을 입력하세요"
                    />
                    <Button
                      onClick={() => handleTransferTokens(TEST_ACCOUNTS.user)}
                      disabled={!transferAmount}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      GRN 전송
                    </Button>
                  </div>
                </div>

                {/* RWD 토큰 전송 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    RWD 전송 (관리자 → GreenLoop)
                  </label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      value={rwdTransferAmount}
                      onChange={(e) => setRwdTransferAmount(e.target.value)}
                      placeholder="전송할 RWD 수량을 입력하세요"
                    />
                    <Button
                      onClick={handleRwdTransfer}
                      disabled={!rwdTransferAmount}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      RWD 전송
                    </Button>
                  </div>
                </div>

                {/* 잔액 확인 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    토큰 잔액 확인
                  </label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <select
                        className="flex-1 p-2 border rounded-md"
                        value={balanceCheckAddress}
                        onChange={(e) => {
                          setBalanceCheckAddress(e.target.value);
                          if (e.target.value) {
                            checkBalances(e.target.value);
                          }
                        }}
                      >
                        <option value="">주소 선택</option>
                        <option value={TEST_ACCOUNTS.admin}>관리자 계정</option>
                        <option value={TEST_ACCOUNTS.user}>사용자 계정</option>
                        <option value={TEST_ACCOUNTS.greenLoop}>
                          GreenLoop 컨트랙트
                        </option>
                      </select>
                    </div>
                    <Input
                      type="text"
                      value={balanceCheckAddress}
                      onChange={(e) => setBalanceCheckAddress(e.target.value)}
                      placeholder="또는 직접 주소 입력"
                      className="w-full"
                    />
                    <Button
                      onClick={() => checkBalances(balanceCheckAddress)}
                      disabled={!balanceCheckAddress}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      잔액 확인
                    </Button>
                    {balanceCheckAddress && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium">확인된 잔액:</p>
                        <p>
                          GRN:{" "}
                          {parseFloat(checkedBalances.grn).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 4 }
                          )}
                        </p>
                        <p>
                          RWD:{" "}
                          {parseFloat(checkedBalances.rwd).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 4 }
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 스왑 비율 변경 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    새로운 스왑 비율 (RWD/GRN)
                  </label>
                  <Input
                    type="number"
                    value={newSwapRate}
                    onChange={(e) => setNewSwapRate(e.target.value)}
                    placeholder="새로운 스왑 비율을 입력하세요"
                  />
                  <Button
                    onClick={handleSetSwapRate}
                    disabled={!newSwapRate}
                    className="mt-2 w-full bg-green-600 hover:bg-green-700"
                  >
                    스왑 비율 변경
                  </Button>
                </div>
                {/* 토큰 인출 */}
                <Button
                  onClick={handleWithdraw}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  토큰 인출
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 토큰 스왑 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>토큰 스왑</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 현재 스왑 비율 표시 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  현재 스왑 비율 (RWD/GRN)
                </label>
                <div className="text-xl font-bold">
                  {currentSwapRate} RWD/GRN
                </div>
              </div>

              {/* GRN 수량 입력 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  GRN 수량
                </label>
                <Input
                  type="number"
                  value={swapAmount}
                  onChange={(e) => {
                    setSwapAmount(e.target.value);
                    calculateReward(e.target.value);
                  }}
                  placeholder="스왑할 GRN 수량을 입력하세요"
                />
              </div>
              {/* 받을 RWD 수량 표시 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  받을 RWD 수량
                </label>
                <div className="text-xl font-bold">
                  {parseFloat(rewardAmount).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{" "}
                  RWD
                </div>
              </div>
              {/* 현재 허용량 표시 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  현재 허용량 (Allowance)
                </label>
                <div className="text-xl font-bold">
                  {parseFloat(allowance).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{" "}
                  GRN
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  * 스왑하기 전에 반드시 허용량을 설정해야 합니다.
                </p>
              </div>
              {/* 허용량 설정 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  GRN 허용량 설정
                </label>
                <Input
                  type="number"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  placeholder="허용할 GRN 수량을 입력하세요"
                />
                <Button
                  onClick={handleApprove}
                  disabled={!approveAmount}
                  className="mt-2 w-full bg-green-600 hover:bg-green-700"
                >
                  허용량 설정
                </Button>
              </div>
              {/* 스왑 실행 */}
              <Button
                onClick={handleSwap}
                disabled={!swapAmount || !account}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                스왑하기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 스왑 이력 */}
        <Card>
          <CardHeader>
            <CardTitle>스왑 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>GRN 수량</TableHead>
                  <TableHead>RWD 수량</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {swapHistory
                  .slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  )
                  .map((swap: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(swap[2] * 1000).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {parseFloat(
                          ethers.utils.formatEther(swap[0])
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}{" "}
                        GRN
                      </TableCell>
                      <TableCell>
                        {parseFloat(
                          ethers.utils.formatEther(swap[1])
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}{" "}
                        RWD
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>

            {/* 페이지네이션 컨트롤 */}
            <div className="flex justify-center items-center space-x-4 mt-4">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <span className="text-sm">
                페이지 {currentPage} /{" "}
                {Math.ceil(swapHistory.length / itemsPerPage) || 1}
              </span>
              <Button
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage * itemsPerPage >= swapHistory.length}
              >
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
