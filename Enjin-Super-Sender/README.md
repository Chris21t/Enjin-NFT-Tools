# Super Sender

Super Sender is a command-line tool built with the Polkadot API to facilitate the sending of tokens to multiple recipients. This tool supports sending tokens on multiple networks such as `enjin` and `canary`.

## Features:
- Interactive CLI interface.
- Logging of transactions with timestamps.
- Option to send tokens to a single recipient or to multiple recipients from a file.
- Network selection between `enjin` and `canary`.

## Prerequisites:
1. [Node.js](https://nodejs.org/) must be installed on your system. You can download it from the [official Node.js website](https://nodejs.org/).
2. Required npm packages: 
    - `@polkadot/api`
    - `inquirer`
    - `winston`
    - `chalk`

## How to Use:

1. Clone the repository or download the `super_sender.js` script.
2. Navigate to the script's directory in your command-line interface.
3. Install required npm packages by running:
    ```shell
    npm install @polkadot/api inquirer winston chalk
    ```
4. Ensure the `SEED_PHRASE` inside the script is replaced with your actual seed phrase.
5. If using the 'multiple' recipient mode, ensure there's a `recipients.txt` file in the same directory with one address per line.
6. Run the script by executing:
    ```shell
    node super_sender.js
    ```
7. Follow the on-screen prompts to select the network, input collection ID, tokenId, and choose the recipient mode.
8. If you choose 'multiple' recipients, the script will send tokens to the addresses listed in the `recipients.txt` file.

## Logs:
- All transactions and errors are logged with timestamps.
- Logs are saved to `transaction.log`.

## Important Note:
- Ensure your seed phrase is kept confidential and secure. Do not expose it in a public or shared environment.
- Always test your transactions on a test network before executing them on the main network.

## Contributing:
Contributions are welcome! Please fork the repository and submit pull requests for any enhancements or fixes you have made.