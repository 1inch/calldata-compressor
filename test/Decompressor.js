const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ether, expect, trim0x } = require('@1inch/solidity-utils');
const { compress } = require('../js/compressor.js');

const CALLDATAS_LIMIT = 5;

let popularCalldatas = [];
try {
    popularCalldatas = require('./dict.json');
} catch (e) {}

describe('Decompressor', function () {
    async function initContracts () {
        const [addr1, addr2] = await ethers.getSigners();
        const chainId = (await ethers.provider.getNetwork()).chainId;

        const DecompressorExtMock = await ethers.getContractFactory('DecompressorExtensionMock');
        const decompressorExt = await DecompressorExtMock.deploy('TokenWithDecompressor', 'TWD');
        await decompressorExt.deployed();

        return { addr1, addr2, decompressorExt, chainId };
    };

    async function initContractsWithDict () {
        const { addr1, addr2, decompressorExt, chainId } = await initContracts();

        const dataParts = 20;
        for (let i = 0; i < popularCalldatas.length; i++) {
            if (popularCalldatas[i] === '0x') {
                popularCalldatas.splice(i, 1);
                i--;
            }
            popularCalldatas[i] = ethers.utils.hexZeroPad(popularCalldatas[i], 32);
        }
        const partIndex = Math.ceil(popularCalldatas.length / dataParts);
        for (let i = 0; i < partIndex; i++) {
            await decompressorExt.setDataArray(i * dataParts + 2, popularCalldatas.slice(i * dataParts, (i + 1) * dataParts));
        }

        return { addr1, addr2, decompressorExt, chainId };
    }

    async function initContractsAndLoadCalldatas () {
        const { addr1, decompressorExt, chainId } = await initContractsWithDict();

        let calldatas = {};
        try {
            calldatas = require('./tx-calldata.json');
        } catch (e) {
            console.warn('\x1b[33m%s\x1b[0m', 'Warning: ', 'There is no tx-calldata.json');
        }

        return { addr1, decompressorExt, chainId, calldatas };
    };

    async function initContractsWithDictAndMint () {
        const { addr1, addr2, decompressorExt, chainId } = await initContractsWithDict();

        await decompressorExt.mint(addr1.address, ether('1000'));
        await decompressorExt.mint(addr2.address, ether('1000'));

        return { addr1, addr2, decompressorExt, chainId };
    }

    async function initContractsWithDictAndMintAndApprove () {
        const { addr1, addr2, decompressorExt, chainId } = await initContractsWithDictAndMint();

        await decompressorExt.connect(addr2).approve(addr1.address, ether('1000'));

        return { addr1, addr2, decompressorExt, chainId };
    }

    async function generateCompressedCalldata (decompressorExt, method, params, wallet) {
        const calldata = decompressorExt.interface.encodeFunctionData(method, params);
        return await compress(calldata, decompressorExt, wallet.address, popularCalldatas.length);
    }

    describe('Compress and decompress', function () {
        it('calc compress @skip-on-coverage', async function () {
            const { addr1, decompressorExt, calldatas } = await loadFixture(initContractsAndLoadCalldatas);

            let counter = 0;
            let averageZipPower = 0;
            for (const tx in calldatas) {
                const result = await compress(calldatas[tx], decompressorExt, addr1.address, popularCalldatas.length);
                const zipPower = result.power.range() * 100 / result.power.decompressedSize;
                averageZipPower += zipPower;
                console.log(tx, result.power, 'zipPower =', zipPower);
                expect(result.compressedData.length).to.lt(calldatas[tx].length);
                if (counter++ === CALLDATAS_LIMIT) break;
            }
            console.log('averageZipPower =', averageZipPower / counter);
        });

        it('should decompress without calldata', async function () {
            const { decompressorExt } = await loadFixture(initContractsWithDict);
            const decompressedCalldata = await ethers.provider.call({
                to: decompressorExt.address,
                data: decompressorExt.interface.encodeFunctionData('decompressed'),
            });
            expect(ethers.utils.defaultAbiCoder.decode(['bytes'], decompressedCalldata)).to.deep.eq(['0x']);
        });

        it('should decompress zero bytes', async function () {
            const { addr1, decompressorExt } = await loadFixture(initContractsWithDict);
            const calldata = '0x00000000';
            const result = await compress(calldata, decompressorExt, addr1.address, popularCalldatas.length);
            const decompressedCalldata = await ethers.provider.call({
                to: decompressorExt.address,
                data: decompressorExt.interface.encodeFunctionData('decompressed') + trim0x(result.compressedData),
            });
            expect(ethers.utils.defaultAbiCoder.decode(['bytes'], decompressedCalldata)).to.deep.eq([calldata]);
        });

        it('should decompress random bytes', async function () {
            const { addr1, decompressorExt } = await loadFixture(initContractsWithDict);
            const calldata = '0xabaabbcc0102';
            const result = await compress(calldata, decompressorExt, addr1.address, popularCalldatas.length);
            const decompressedCalldata = await ethers.provider.call({
                to: decompressorExt.address,
                data: decompressorExt.interface.encodeFunctionData('decompressed') + trim0x(result.compressedData),
            });
            expect(ethers.utils.defaultAbiCoder.decode(['bytes'], decompressedCalldata)).to.deep.eq([calldata]);
        });

        it('should decompress calldatas with all cases @skip-on-coverage', async function () {
            const { addr1, decompressorExt, calldatas } = await loadFixture(initContractsAndLoadCalldatas);

            let counter = 0;
            for (const tx in calldatas) {
                const result = await compress(calldatas[tx], decompressorExt, addr1.address, popularCalldatas.length);
                const decompressedCalldata = await ethers.provider.call({
                    to: decompressorExt.address,
                    data: decompressorExt.interface.encodeFunctionData('decompressed') + trim0x(result.compressedData),
                });
                expect(ethers.utils.defaultAbiCoder.decode(['bytes'], decompressedCalldata)).to.deep.eq([calldatas[tx]]);
                if (counter++ === CALLDATAS_LIMIT) break;
            }
        });
    });

    describe('Setup _dict', function () {
        it('shouldn\'t set data to reserved offset in dict', async function () {
            const { decompressorExt } = await loadFixture(initContracts);
            await expect(decompressorExt.setData(0, ethers.utils.hexZeroPad('0x01', 32))).to.be.revertedWithCustomError(decompressorExt, 'TooSmallOffset');
        });

        it('shouldn\'t set data array to reserved offset in dict', async function () {
            const { decompressorExt } = await loadFixture(initContracts);
            const dict = [
                ethers.utils.hexZeroPad('0x01', 32),
                ethers.utils.hexZeroPad('0x02', 32),
                ethers.utils.hexZeroPad('0x03', 32),
            ];
            await expect(decompressorExt.setDataArray(0, dict)).to.be.revertedWithCustomError(decompressorExt, 'TooSmallOffset');
        });

        it('shouldn\'t get data from reserved offset in dict', async function () {
            const { decompressorExt } = await loadFixture(initContracts);
            await expect(decompressorExt.getData(0, 2)).to.be.revertedWithCustomError(decompressorExt, 'TooSmallOffset');
            await expect(decompressorExt.getData(1, 2)).to.be.revertedWithCustomError(decompressorExt, 'TooSmallOffset');
        });

        it('should set data to dict and get it', async function () {
            const { decompressorExt } = await loadFixture(initContracts);
            await decompressorExt.setData(2, ethers.utils.hexZeroPad('0x01', 32));
            expect(await decompressorExt.getData(2, 3)).to.deep.equal(['0x0000000000000000000000000000000000000000000000000000000000000001']);
        });

        it('should set data array to dict and get it', async function () {
            const { decompressorExt } = await loadFixture(initContracts);
            const dict = [
                ethers.utils.hexZeroPad('0x01', 32),
                ethers.utils.hexZeroPad('0x02', 32),
                ethers.utils.hexZeroPad('0x03', 32),
            ];
            await decompressorExt.setDataArray(2, dict);
            expect(await decompressorExt.getData(2, 5)).to.deep.equal(dict);
        });

        it('should return empty dict when begin more than end', async function () {
            const { decompressorExt } = await loadFixture(initContracts);
            expect(await decompressorExt.getData(5, 4)).to.deep.equal([]);
        });
    });

    describe('Real-world', function () {
        it('ERC20 transfer via decompressor', async function () {
            const { addr1, addr2, decompressorExt } = await loadFixture(initContractsWithDictAndMint);

            const calldata = await generateCompressedCalldata(decompressorExt, 'transfer', [addr2.address, ether('1')], addr1);
            await expect(
                addr1.sendTransaction({
                    to: decompressorExt.address,
                    data: decompressorExt.interface.encodeFunctionData('decompress') + trim0x(calldata.compressedData),
                }),
            ).to.changeTokenBalances(
                decompressorExt,
                [addr1, addr2],
                [-ether('1'), ether('1')],
            );
        });

        it('ERC20 approve via decompressor', async function () {
            const { addr1, addr2, decompressorExt } = await loadFixture(initContractsWithDictAndMint);

            const calldata = await generateCompressedCalldata(decompressorExt, 'approve', [addr2.address, ether('1')], addr1);
            await addr1.sendTransaction({
                to: decompressorExt.address,
                data: decompressorExt.interface.encodeFunctionData('decompress') + trim0x(calldata.compressedData),
            });
            expect(await decompressorExt.allowance(addr1.address, addr2.address)).to.equal(ether('1'));
        });

        it('ERC20 transferFrom via decompressor', async function () {
            const { addr1, addr2, decompressorExt } = await loadFixture(initContractsWithDictAndMintAndApprove);

            const calldata = await generateCompressedCalldata(decompressorExt, 'transferFrom', [addr2.address, addr1.address, ether('1')], addr1);
            await expect(
                addr1.sendTransaction({
                    to: decompressorExt.address,
                    data: decompressorExt.interface.encodeFunctionData('decompress') + trim0x(calldata.compressedData),
                }),
            ).to.changeTokenBalances(
                decompressorExt,
                [addr1, addr2],
                [ether('1'), -ether('1')],
            );
        });
    });

    describe('Gas usage @skip-on-coverage', function () {
        it('ERC20 transfer', async function () {
            const { addr1, addr2, decompressorExt } = await loadFixture(initContractsWithDictAndMint);

            // regular erc20 transfer
            const tx = await decompressorExt.transfer(addr2.address, ether('1'));
            const regularGasUsed = (await tx.wait()).gasUsed;

            // erc20 transfer with decompressor
            const calldata = await generateCompressedCalldata(decompressorExt, 'transfer', [addr2.address, ether('1')], addr1);
            const txWithDecompress = await addr1.sendTransaction({
                to: decompressorExt.address,
                data: decompressorExt.interface.encodeFunctionData('decompress') + trim0x(calldata.compressedData),
            });
            const decompressorGasUsed = (await txWithDecompress.wait()).gasUsed;
            console.log(`erc20 transfer regularGasUsed ${regularGasUsed}, decompressorGasUsed ${decompressorGasUsed}`);
            expect(regularGasUsed).to.lt(decompressorGasUsed);
        });

        it('ERC20 approve', async function () {
            const { addr1, addr2, decompressorExt } = await loadFixture(initContractsWithDictAndMint);

            // warmup allowance
            await decompressorExt.approve(addr2.address, ether('1'));

            // regular erc20 approve
            const tx = await decompressorExt.approve(addr2.address, ether('1'));
            const regularGasUsed = (await tx.wait()).gasUsed;

            // erc20 approve with decompressor
            const calldata = await generateCompressedCalldata(decompressorExt, 'approve', [addr2.address, ether('1')], addr1);
            const txWithDecompress = await addr1.sendTransaction({
                to: decompressorExt.address,
                data: decompressorExt.interface.encodeFunctionData('decompress') + trim0x(calldata.compressedData),
            });
            const decompressorGasUsed = (await txWithDecompress.wait()).gasUsed;
            console.log(`erc20 approve regularGasUsed ${regularGasUsed}, decompressorGasUsed ${decompressorGasUsed}`);
            expect(regularGasUsed).to.lt(decompressorGasUsed);
        });

        it('ERC20 transferFrom', async function () {
            const { addr1, addr2, decompressorExt } = await loadFixture(initContractsWithDictAndMintAndApprove);

            // regular erc20 transferFrom
            const tx = await decompressorExt.transferFrom(addr2.address, addr1.address, ether('1'));
            const regularGasUsed = (await tx.wait()).gasUsed;

            // erc20 transferFrom with decompressor
            const calldata = await generateCompressedCalldata(decompressorExt, 'transferFrom', [addr2.address, addr1.address, ether('1')], addr1);
            const txWithDecompress = await addr1.sendTransaction({
                to: decompressorExt.address,
                data: decompressorExt.interface.encodeFunctionData('decompress') + trim0x(calldata.compressedData),
            });
            const decompressorGasUsed = (await txWithDecompress.wait()).gasUsed;
            console.log(`erc20 transferFrom regularGasUsed ${regularGasUsed}, decompressorGasUsed ${decompressorGasUsed}`);
            expect(regularGasUsed).to.lt(decompressorGasUsed);
        });
    });
});
