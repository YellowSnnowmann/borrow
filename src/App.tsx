import React, { useState, useEffect } from "react";
import "./App.css";
import DataTable from "./table";

export const tokens = [
  "select token",
  "dai",
  "usdt",
  "btc",
  "eth",
  "usdc",
  "foxy",
  "croak",
];

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [borrowToken, setBorrowToken] = useState<string>("");
  const [collateralToken, setCollateralToken] = useState<string>("");
  const [toBridgeAddress, setToBridgeAddress] = useState<string>("");
  const [borrowAmount, setBorrowAmount] = useState<string>();
  const [checked, setChecked] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `http://139.144.186.227:5006/zerolend?aToken=${collateralToken}&vToken=${borrowToken}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        
        const result = await response.json();
        setData(result.reserves);
      } catch (err: any) {
        setData(null);
        console.log(err.message);
      }
    };

    fetchData();
  }, [borrowToken, collateralToken]);

  const connectMetaMask = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);

        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        setChainId(chainId);

        window.ethereum.on("accountsChanged", (accounts: string[]) => {
          setAccount(accounts[0]);
        });

        window.ethereum.on("chainChanged", (chainId: string) => {
          setChainId(chainId);
        });
      } catch (error) {
        console.error("Error connecting MetaMask:", error);
      }
    } else {
      console.log("MetaMask is not installed!");
    }
  };

  useEffect(() => {
    connectMetaMask();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="title">Borrow</h1>
        {/* <h3>use Linea only</h3> */}
        <div className="wallet-info">
          {account ? (
            <div className="account-info">
              <p>Account: {account}</p>
              <p>Network: {chainId}</p>
            </div>
          ) : (
            <button className="connect-btn" onClick={connectMetaMask}>
              Connect MetaMask
            </button>
          )}
        </div>
      </header>
      <div className="token-selector">
        <div className="borrow-section">
          <label>Borrow</label>
          <select
            value={borrowToken}
            onChange={(e) => setBorrowToken(e.target.value)}
          >
            {Array.from(tokens).map((token, index) => (
              <option value={token} key={index}>
                {token}
              </option>
            ))}
          </select>
        </div>

        <div className="collateral-section">
          <label>Collateral</label>
          <select
            value={collateralToken}
            onChange={(e) => setCollateralToken(e.target.value)}
          >
            {Array.from(tokens).map((token, index) => (
              <option value={token} key={index}>
                {token}
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            className="input-amount"
            type="number"
            placeholder="Amount to borrow (1 for 1 USDC)"
            onChange={(e) => setBorrowAmount(e.target.value)}
          />

          <div className="checkbox-container">
            <input
              type="checkbox"
              checked={checked}
              id="cb"
              onChange={(e) => setChecked(!checked)}
            />
            <label htmlFor="cb">Use different address</label>
          </div>

          {checked && (
            <input
              className="address-input"
              type="text"
              placeholder="Address to bridge"
              onChange={(e) => setToBridgeAddress(e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="table">
        {collateralToken &&
        borrowToken &&
        (collateralToken !== "select token" ||
          borrowToken !== "select token") &&
        data &&
        borrowAmount ? (
          collateralToken !== borrowToken ? (
            <DataTable
              collateral={collateralToken}
              borrow={borrowToken}
              data={data}
              toBridgeAddress={toBridgeAddress}
              borrowAmount={borrowAmount}
            />
          ) : (
            "collateral and token to borrow cannot be same"
          )
        ) : (
          "Please select tokens to continue"
        )}
      </div>
    </div>
  );
}

export default App;
