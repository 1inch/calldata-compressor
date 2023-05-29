require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('@nomicfoundation/hardhat-chai-matchers');
require('solidity-coverage');
require('hardhat-dependency-compiler');
require('hardhat-deploy');
require('hardhat-gas-reporter');
require('hardhat-tracer');
require('dotenv').config();

const { networks } = require('./hardhat.networks');

module.exports = {
    solidity: {
        version: '0.8.19',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000000,
            },
            viaIR: true,
        },
    },
    networks,
    gasReporter: {
        enabled: true,
        currency: 'USD',
    },
    typechain: {
        target: 'ethers-v5',
    },
    tracer: {
        enableAllOpcodes: true,
    },
};
