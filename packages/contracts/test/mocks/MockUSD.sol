// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// Test-only stand-in for a 6-decimal stablecoin (used to dry-run the mainnet script locally).
contract MockUSD is ERC20 {
    constructor() ERC20("Mock USD", "mUSD") {}
    function decimals() public pure override returns (uint8) { return 6; }
}
