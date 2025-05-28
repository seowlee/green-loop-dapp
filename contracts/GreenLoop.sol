// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GreenLoop is Ownable {

    struct SwapHistory {
        uint256 amountGRN;
        uint256 amountRWD;
        uint256 timestamp;
    }

    address public greenToken;
    address public rewardToken;
    uint256 public swapRate;

    mapping(address => SwapHistory[]) public userSwaps;
    mapping(address => uint256) public totalSwapped;

    event Swapped(address indexed user, uint256 amountGRN, uint256 amountRWD);
    event RateUpdated(uint256 newRate);
    event TokensWithdrawn(address token, uint256 amount);

    constructor(address _greenToken, address _rewardToken, uint256 _swapRate)
        Ownable(msg.sender) // ✅ 명시적 호출
    {
        greenToken = _greenToken;
        rewardToken = _rewardToken;
        swapRate = _swapRate;
    }

    function setSwapRate(uint256 _newRate) external onlyOwner {
        require(_newRate > 0, "Rate must be positive");
        swapRate = _newRate;
        emit RateUpdated(_newRate);
    }

    function swap(uint256 amountGRN) external {
        require(amountGRN > 0, "Amount must be greater than zero");
        // uint256 amountRWD = amountGRN * swapRate;
        uint256 amountRWD = amountGRN * swapRate / 1e18;

        require(IERC20(greenToken).transferFrom(msg.sender, address(this), amountGRN), "GreenToken transfer failed");
        require(IERC20(rewardToken).transfer(msg.sender, amountRWD), "RewardToken transfer failed");

        userSwaps[msg.sender].push(SwapHistory(amountGRN, amountRWD, block.timestamp));
        totalSwapped[msg.sender] += amountGRN;

        emit Swapped(msg.sender, amountGRN, amountRWD);
    }

    function getSwapHistory(address user) external view returns (SwapHistory[] memory) {
        return userSwaps[user];
    }

    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner(), amount), "Withdraw failed");
        emit TokensWithdrawn(token, amount);
    }
}
