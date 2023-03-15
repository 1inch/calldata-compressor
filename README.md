<div align="center">
    <img src="https://github.com/1inch/calldata-compressor/blob/master/.github/1inch_github_w.svg#gh-light-mode-only">
    <img src="https://github.com/1inch/calldata-compressor/blob/master/.github/1inch_github_b.svg#gh-dark-mode-only">
</div>

# Calldata Compressor and Decompressor

[![Build Status](https://github.com/1inch/calldata-compressor/workflows/CI/badge.svg)](https://github.com/1inch/calldata-compressor/actions)
[![Coverage Status](https://codecov.io/gh/1inch/calldata-compressor/branch/master/graph/badge.svg?token=HJWBIVXQQA)](https://codecov.io/gh/1inch/calldata-compressor)
[![NPM Package](https://img.shields.io/npm/v/@1inch/calldata-compressor.svg)](https://www.npmjs.org/package/@1inch/calldata-compressor)


This is a project with script for compress calldata and Solidity contract for decompress it.

## Decompress algo

It's algorithm for decompress compressed data, which implements in `_decompressed` method of `DecompressorExtension` contract.
The algorithm is to consider each of the compressed calldata's bytes in a row from 0 to the last and perform certain actions depending on the conditions.
Depending on the first bits of a byte, it determines how the next bits or the next few bytes are handled. The following bitmasks are used to explain how to interpret a byte, or multiple bytes, to get a decompressed calldata:

- `00XXXXXX` - N zero bytes, where N is equal to (number in `XXXXXX`) + 1.
- `01PXXXXX` - copy next N bytes, where N is equal to (number in `XXXXX`) + 1, and if P=1 then pad this copied part with zeros to 32 bytes.
- `10BBXXXX XXXXXXXX` - use 12 bits (`XX...X`) as key for N bytes from storage `_dict`, where N is equal value in the array `[32,20,4,31]` with index K, where K equals to number in `BB`.
- `11BBXXXX XXXXXXXX XXXXXXXX` - use 20 bits (`XX...X`) as key for N bytes from storage `_dict`, where N is equal value in the array `[32,20,4,31]` with index K, where K equals to number in `BB`.

## Compress algo

It's algorithm for compress data. It's checks all cases with bitmasks from Decompress algo section and uses dynamic algorithm to choose the best case with most zip functionallity.
It calculates all the possible applications of different masks for each byte of the code, and then iterates over all the options using dynamic programming and chooses the best option.

## Contract Overview
This contract provides a `DecompressorExtension` abstract contract that extends `Ownable` from the OpenZeppelin library. It decompresses compressed calldata. It contains the following functions:

- `getData`: retrieves data from the contract's dictionary and returns it in an array.
- `setData`: sets a single value in the contract's dictionary.
- `setDataArray`: sets multiple values in the contract's dictionary.
- `decompress`: decompresses data stored in the contract using a compression algorithm.
- `decompressed`: returns the decompressed data as bytes.

### Usage
To use this contract, you must create a new contract that inherits from `DecompressorExtension`.

#### `getData`
To use the `getData` function, call it with a beginning and ending index, which will return an array of data values from the dictionary.
First 2 positions are reserved with `msg.sender`and `address(this)`, so you can't get it.

#### `setData`
To use the `setData` function, call it with an offset and a value. This function can only be called by the owner of the contract.
First 2 positions are reserved with `msg.sender`and `address(this)`, so you can't set it.

#### `setDataArray`
To use the `setDataArray` function, call it with an offset and an array of values. This function can only be called by the owner of the contract.
First 2 positions are reserved with `msg.sender`and `address(this)`, so you can't set it.

#### `decompress`
To use the `decompress` function, send a transaction to the contract with compressed data as input. This function will delegate call the `decompressed` function, which returns the decompressed data as bytes.

#### `decompressed`
To use the `decompressed` function, call it directly. This function returns the decompressed data as bytes.

## JS Compress script

To use compress script use `compress` method
```
const { compress } = require('@1inch/calldata-compressor/js/compressor.js');
```

### Description of `compress` function

You have to fill dictionary, which you want to use in compress/decompress processes, using `setDataArray` or `setData` methods before use `compress` method. If you do not do this, then the compression will be without taking into account the dictionary.
This is an asynchronous function that takes four parameters:

1. `calldata` - This parameter is expected to contain some data that needs to be compressed.
2. `decompressorExt` - This parameter is expected to be a Contract object of `DecompressorExtension`.
3. `wallet` - This parameter is expected to be a `msg.sender` address.
4. `initDictAmount` - This parameter is optional and has a default value of 1000. It represents the initial dictionary size to be used during compression.

This function compresses some data using dynamic programming and chooses the best compressed data.

### CompressDataDescription Class
Represents a description of how to compress a specific portion of data. It has three properties:

- `startByte`: Represents the starting byte index of the data portion to compress.
- `amountBytes`: Represents the number of bytes to compress starting from the `startByte` index.
- `method`: Represents the compression method (decompress mask) to use.

### CompressDataPower Class
Represents the power of the compressed data. It has two properties:

- `decompressedSize`: Represents the size of the original (decompressed) data in bytes.
- `compressedSize`: Represents the size of the compressed data in bytes.

It also has two methods:

- `range()`: Returns the difference between `decompressedSize` and `compressedSize`.
- `add(c)`: Adds the `decompressedSize` and `compressedSize` of another `CompressDataPower` instance `c` to the current instance.

### CompressData Class
Represents the compressed data itself, along with its description and power. It has two properties:

- `power`: An instance of `CompressDataPower` representing the power of the compressed data.
- `description`: An instance of `CompressDataDescription` representing the description of how the data was compressed.

### Calldata Class
This class provides a tool to compress a hexadecimal string representing a smart contract call. The compression is done by replacing repeating patterns with more concise descriptions, resulting in a smaller encoded string.

#### analyse()
- Analyzes the hexadecimal data and computes compression information for each byte.
- **Returns**:
    - `Array` - An array of objects containing information about compression for each byte. Each object has the following properties:
        - `index`: The index of the byte.
        - `zeroCompress`: An object with information about the number of contiguous zeros that can be compressed.
        - `copyCompress`: An object with information about the number of bytes that can be compressed by copying a next block of data.
        - `storageCompress`: An array with objects containing information about blocks that can be compressed using data from the dictionary.

#### #compressPart(fromByte, toByte)
- Compresses a part of the hexadecimal data between the specified byte indexes.
- **Arguments**:
    - `fromByte` - The index of the first byte to be compressed.
    - `toByte` - The index of the last byte to be compressed.
- **Returns**:
    - `CompressData` - The compressed data information, including the compressed power and description.

#### compress()
- Compresses all hex data by splitting it into parts, compressing each part and choosing the best combination to compress.
- **Returns**:
    - `Array` - An array of compressed data parts, each containing the compressed power and description.

## Tests environment
You can find examples of `dict` and `calldatas` in IPFS:
| File  | IPFS CID |
| ------------- | ------------- |
| `dict.json`  | Qmb4fEEdQe9QB4ChBFK8bJVkefCjG4nB91hgQ2kcKsKGWK  |
| `tx-calldata.json`  | QmQnjk5MKMiC6jZNjWgXKkbCMFFznNYaHRsS281jV94wpe  |

Just add this files to `./test` dir

## License
This contract is licensed under the MIT license, as indicated by the SPDX-License-Identifier.
