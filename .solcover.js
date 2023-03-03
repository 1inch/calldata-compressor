module.exports = {
    skipFiles: ['mocks', 'interfaces'],
    mocha: {
        grep: "@skip-on-coverage",
        invert: true
    },
}
