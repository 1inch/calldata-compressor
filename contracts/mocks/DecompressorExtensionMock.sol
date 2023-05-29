// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { TokenMock } from "@1inch/solidity-utils/contracts/mocks/TokenMock.sol";
import { DecompressorExtension } from "../DecompressorExtension.sol";

contract DecompressorExtensionMock is TokenMock, DecompressorExtension {
    // solhint-disable-next-line no-empty-blocks
    constructor(string memory name, string memory symbol) TokenMock(name, symbol) {}

    // solhint-disable-next-line no-empty-blocks, payable-fallback
    fallback () external {}

    function setData(uint256 offset, bytes32 data) external onlyOwner {
        _setData(offset, data);
    }

    function setDataArray(uint256 offset, bytes32[] calldata dataArray) external onlyOwner {
        _setDataArray(offset, dataArray);
    }
}
