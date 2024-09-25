import React, { useState } from "react";
import "./App.css";
import poolABI from "./abi/Pool.json";
import erc20ABI from "./abi/ERC20.json";
import lineaBridgeABI from "./abi/LineaBridge.json";

import { ethers } from "ethers";

const chainIds = {
  linea: "0xe708",
  ethereum: "0x1",
  // manta: "0xa9",
  // era: "0x144",
};

const DataTable = (props: {
  collateral: string;
  borrow: string;
  data: any;
  toBridgeAddress: string;
  borrowAmount: string;
}) => {
  const lineaBridge = ethers.getAddress(
    "0x504A330327A089d8364C4ab3811Ee26976d388ce"
  );
  // console.log("data", props);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  // const [borrowAmount, setBorrowAmount] = useState<string>("1"); // default 1 DAI
  const [collateralAmount, setCollateralAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [chainIdCurrent, setChainIdCurrent] = useState<string>("");
  const [message, setMessage] = useState<string>(
    "Processing your transaction, please wait..."
  );
  const handleOpenModal = async (item: any) => {
    console.log(
      36,
      chainIdCurrent === chainIds.ethereum &&
        props.borrow.toLowerCase() === "usdc"
    );
    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });
    setChainIdCurrent(chainId);
    if (chainIdCurrent !== item.chain) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: chainIds[item.chain as keyof typeof chainIds],
          },
        ],
      });
    }
    setSelectedItem(item);
    setModalOpen(true);
    setLoading(false); // Reset loading
    setSuccess(false); // Reset success
    updateCollateralAmount(item.ltv, props.borrowAmount, item); // default borrowAmount = 1
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
    setLoading(false);
    setSuccess(false);
  };

  const updateCollateralAmount = (
    ltv: string,
    borrowAmount: string,
    item: any
  ) => {
    const calculatedCollateralInUSD =
      (Number(borrowAmount) * Number(item.vToken_price)) / (Number(ltv) / 2);

    const calculatedCollateral = calculatedCollateralInUSD / item.aToken_price;
    console.log("calculatedCollateral", item);
    setCollateralAmount(calculatedCollateral.toFixed(5));
  };

  const createParams = async () => {
    if (!selectedItem) return;

    setLoading(true); // Start loading
    console.log(72);
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const interestRateMode = 2; // 1 = stable, 2 = variable
    const referralCode = 0; // Referral code, 0 if not applicable

    const poolAddress = ethers.getAddress(selectedItem.poolAddres);
    const poolContract = new ethers.Contract(poolAddress, poolABI, signer);

    const debtAddress = ethers.getAddress(selectedItem.debtAddress);
    const borrowContract = new ethers.Contract(debtAddress, erc20ABI, signer);
    const borrowAmountWei = ethers.parseUnits(
      props.borrowAmount,
      await borrowContract.decimals()
    );

    const collateralAddress = ethers.getAddress(selectedItem.collateralAddress);
    const collateralContract = new ethers.Contract(
      collateralAddress,
      erc20ABI,
      signer
    );
    const collateralAmountWei = ethers.parseUnits(
      collateralAmount,
      await collateralContract.decimals()
    );

    const ethereumLineaUSDCBridge = new ethers.Contract(
      lineaBridge,
      lineaBridgeABI,
      signer
    );
    const onBehalfOf = signer.address; // Borrowing for the connected account

    // Execute the transaction
    try {
      setMessage(
        `approving ${collateralAmountWei} ${props.collateral}, please wait...`
      );

      const allowanceTx = await collateralContract.approve(
        poolAddress,
        collateralAmountWei
      );

      await allowanceTx.wait();

      setMessage(`supplying ${collateralAmountWei}, please wait...`);

      const tx_supply = await poolContract.supply(
        collateralAddress,
        collateralAmountWei,
        onBehalfOf,
        referralCode
      ); 

      await tx_supply.wait();

      setMessage(`borrowing ${await borrowContract.symbol()}, please wait...`);

      const tx = await poolContract.borrow(
        debtAddress,
        borrowAmountWei,
        interestRateMode,
        referralCode,
        onBehalfOf
      );

      await tx.wait();
      console.log("Borrow successful:", tx);

      if (
        chainIdCurrent === chainIds.ethereum &&
        props.borrow.toLowerCase() === "usdc"
      ) {
        setMessage(
          `approving ${await borrowContract.symbol()}, please wait...`
        );

        const allowanceTx = await borrowContract.approve(
          lineaBridge,
          borrowAmountWei
        );
        await allowanceTx.wait();

        setMessage(
          `transferring ${await borrowContract.symbol()} to linea, please wait...`
        );
        const depositToTX = await ethereumLineaUSDCBridge.depositTo(
          borrowAmountWei,
          props.toBridgeAddress !== "" ? props.toBridgeAddress : signer.address
        );

        await depositToTX.wait();
      }

      setLoading(false); // Stop loading
      setSuccess(true); // Mark success
    } catch (error) {
      alert(error);
      console.error("Error:", error);
      setLoading(false); // Stop loading in case of an error
    }
  };

  return (
    <>
      <table
        border={1}
        cellPadding="10"
        cellSpacing="0"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Route</th>
            <th>Project</th>
            <th>Chain</th>
            <th>LTV</th>
            <th>Borrow APY</th>
          </tr>
        </thead>
        <tbody>
          {props.data &&
            props.data.map((item: any, index: any) => (
              <tr
                key={index}
                onClick={() => handleOpenModal(item)}
                className="clickable-row"
              >
                <td>{item.route}</td>
                <td>{item.project}</td>
                <td>{item.chain}</td>
                <td>{item.ltv}</td>
                <td>{item.borrowApy.toFixed(2)}%</td>
              </tr>
            ))}
        </tbody>
      </table>

      {modalOpen && selectedItem && (
        <div className="modal">
          <div className="modal-content">
            <h2>
              {loading
                ? "Borrowing..."
                : success
                ? `${props.borrowAmount} ${props.borrow} Borrowed`
                : `Borrow: ${props.borrowAmount} ${props.borrow}`}
            </h2>
            {!loading && !success && (
              <>
                <h2>
                  Required Collateral : {collateralAmount} {props.collateral}
                </h2>
                <p>
                  {chainIdCurrent === chainIds.ethereum &&
                  props.borrow.toLowerCase() === "usdc"
                    ? `Borrowed USDC will be transferred to ${
                        props.toBridgeAddress !== ""
                          ? props.toBridgeAddress
                          : "signer address"
                      } on Linea `
                    : ""}
                </p>
                <button onClick={createParams} disabled={loading}>
                  Confirm Borrow
                </button>
                <button onClick={handleCloseModal} disabled={loading}>
                  Cancel
                </button>
              </>
            )}
            {loading && <p>{message}</p>}
            {success && <button onClick={handleCloseModal}>Close</button>}
          </div>
        </div>
      )}
    </>
  );
};

export default DataTable;
