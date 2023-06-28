require('@nomicfoundation/hardhat-ethers');
require('@nomicfoundation/hardhat-verify');
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
    tracer: {
        enableAllOpcodes: true,
    },
};
