// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title TestUSD — testnet-only settlement token for Stewra demos.
/// @notice Anyone can mint a small amount from the faucet. Has no value. Never deploy on mainnet.
contract TestUSD is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1_000 * 1e6;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;
    mapping(address => uint256) public lastFaucetAt;

    error FaucetCooldown(uint256 availableAt);
    error MainnetDeploymentForbidden();

    constructor() ERC20("Stewra Test USD", "tUSD") {
        if (block.chainid == 4663) revert MainnetDeploymentForbidden();
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function faucet() external {
        uint256 next = lastFaucetAt[msg.sender] + FAUCET_COOLDOWN;
        if (lastFaucetAt[msg.sender] != 0 && block.timestamp < next) revert FaucetCooldown(next);
        lastFaucetAt[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
