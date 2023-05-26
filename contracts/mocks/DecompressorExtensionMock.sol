// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;
pragma abicoder v2;

import "@1inch/solidity-utils/contracts/mocks/TokenMock.sol";
import "../DecompressorExtension.sol";

contract DecompressorExtensionMock is TokenMock, DecompressorExtension {
    // solhint-disable-next-line no-empty-blocks
    constructor(string memory name, string memory symbol) TokenMock(name, symbol) {}

    // solhint-disable-next-line no-empty-blocks
    fallback () external payable {}

    function setData(uint256 offset, bytes32 data) external onlyOwner {
        _setData(offset, data);
    }

    function setDataArray(uint256 offset, bytes32[] calldata dataArray) external onlyOwner {
        _setDataArray(offset, dataArray);
    }
}
