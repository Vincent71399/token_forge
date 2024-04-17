"use client";
import React, {useEffect, useState} from "react";
import {ethers} from 'ethers';
import {CONTRACT_ADDRESS, MINT_COOL_DOWN_SEC, TOKEN_CONTRACT_ADDRESS} from "@/app/ethers/config";
import {M3_LOGIC_ABI, M3_TOKEN_ABI} from "@/app/ethers/contract_ABIs";
import {TOKEN_NAMES} from "@/app/constants/tokenNames";


export default function Home() {
  // @ts-ignore
  const provider = new ethers.BrowserProvider(window.ethereum)
  const token_contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, M3_TOKEN_ABI, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, M3_LOGIC_ABI, provider);
  const [tokenValues, setTokenValues] = useState<bigint[]>([])
  let token_list = [0,1,2,3,4,5,6]

  const [linkedWallet, setLinkedWallet] = useState<string>("")

  const [disableBtn, setDisableBtn] = useState<boolean>(false);
  const [underCoolDown, setUnderCoolDown] = useState<boolean>(false);
  const [coolDown, setCoolDown] = useState<number>(0);

  useEffect(() => {
    if(underCoolDown) {
      setCoolDown(MINT_COOL_DOWN_SEC)
      const interval = setInterval(() => {
        setCoolDown(prevCoolDown => {
          if (prevCoolDown === 0) {
            clearInterval(interval);
            return 0;
          }
          return prevCoolDown - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
      }
    }
  }, [underCoolDown]);

  useEffect(() => {
      if(coolDown === 0){
        setDisableBtn(false)
        setUnderCoolDown(false)
      }
  }, [coolDown]);

  useEffect(() => {
    // @ts-ignore
    if(window.ethereum !== null && linkedWallet !== "") {
      // @ts-ignore
      token_contract.owner().then((result: [string]) => {
        console.log("token owner is : " + result)
      })
      contract.owner().then((result: [string]) => {
        console.log("logic owner is : " + result)
      })
      console.log("logic address : " + contract.target)

      syncBalance(token_contract)
    }
  }, [linkedWallet]);

  useEffect(() => {
    connectToWallet().then()
  }, []);

  async function connectToWallet() {
    // @ts-ignore
    if(window.ethereum !== null) {
      try{
        // @ts-ignore
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        })
        console.log(accounts);
        if(accounts.length > 0){
          setLinkedWallet(accounts[0])
        }
      }catch (e){
        console.error(e);
      }

    }else{
      console.log('Meta Mask not detected')
    }
  }

  const syncBalance = (contract: ethers.Contract) => {
    contract.balanceOfBatch(Array(token_list.length).fill(linkedWallet), token_list).then((result: [bigint]) => {
      setTokenValues(result);
    })
  }

  const mint = async(token: number) => {
    // @ts-ignore
    if(window.ethereum !== null) {
      setDisableBtn(true);
      const signer = await provider.getSigner();
      try {
        // @ts-ignore
        const tx = await contract.connect(signer).mint(token);
        const receipt = await tx.wait();
        console.log('Mint Transaction confirmed:', receipt);
        syncBalance(token_contract)
        setUnderCoolDown(true)
      }catch (e){
        console.log(e)
        setDisableBtn(false);
      }
    }
  }

  const burn = async(token: number) => {
    // @ts-ignore
    if(window.ethereum !== null) {
      setDisableBtn(true);
      // @ts-ignore
      const signer = await provider.getSigner();
      try {
        // @ts-ignore
        const tx = await contract.connect(signer).burn(token)
        const receipt = await tx.wait();
        console.log('Burn Transaction confirmed:', receipt);
        setDisableBtn(false);
        syncBalance(token_contract)
      }catch (e){
        console.log(e)
        setDisableBtn(false);
      }
    }
  }

  const tradeToken = async(from: number, to: number) => {
    // @ts-ignore
    if(window.ethereum !== null) {
      setDisableBtn(true);
      // @ts-ignore
      const signer = await provider.getSigner();
      try {
        // @ts-ignore
        const tx = await contract.connect(signer).trade(from, to);
        const receipt = await tx.wait();
        console.log('Trade Transaction confirmed:', receipt);
        syncBalance(token_contract)
        setDisableBtn(false);
      }catch (e) {
        console.log(e)
        setDisableBtn(false);
      }
    }
  }

  const BUTTON_THEME = "flex-1 rounded-md bg-blue-200 disabled:bg-gray-300 hover:bg-blue-400 active:bg-blue-600 p-2"

  return (
      <main className="bg-gray-100 min-h-screen flex flex-col">
        <nav className="flex flex-col sm:flex-col md:flex-row items-center justify-between bg-blue-300 p-6 gap-2">
          <h1 className="text-2xl font-semibold">Token Forge</h1>
          <div className="space-x-5">
            {linkedWallet === "" ?
                <button className={BUTTON_THEME} onClick={connectToWallet}>Connect Metamask</button> :
                <span>{linkedWallet.substring(0, 10)}...{linkedWallet.substring(20, 22)}</span>
            }
          </div>
        </nav>
        <div className="flex flex-col items-center pt-6 pl-6 pr-6">
          <h1 className="text-lg font-bold mb-4">
            {underCoolDown ? `Cool Down Counter: ${coolDown} seconds` : `You can mint now, every successful mint will bring 60 sec cool down`}
          </h1>
          <span><TokenText type={0} quantity={-1} />, <TokenText type={1} quantity={-1} />, <TokenText type={2} quantity={-1} /> are base tokens and can be directly mint and traded with any Token 1 for 1</span>
          <span>Other Tokens need to be forged from base tokens as following: </span>
          <span><TokenText type={3} quantity={1}/> = <TokenText type={0} quantity={1}/> + <TokenText type={1} quantity={1}/></span>
          <span><TokenText type={4} quantity={1}/> = <TokenText type={1} quantity={1}/> + <TokenText type={2} quantity={1}/></span>
          <span><TokenText type={5} quantity={1}/> = <TokenText type={0} quantity={1}/> + <TokenText type={2} quantity={1}/></span>
          <span><TokenText type={6} quantity={1}/> = <TokenText type={0} quantity={1}/> + <TokenText type={1} quantity={1}/> + <TokenText type={2} quantity={1}/></span>
        </div>
        {(linkedWallet && tokenValues.length > 0) &&
          <div className="p-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {token_list.map((item) => (
                <Card key={item}
                      token={item}
                      tokenValue={tokenValues[item]}
                      mintFunc={mint}
                      burnFunc={burn}
                      tradeTokenFunc={tradeToken}
                      disableBtn={disableBtn}/>
            ))}
          </div>}
      </main>
  )
}

interface CardProps {
  token: number;
  tokenValue: bigint;
  mintFunc: (token: number) => void;
  burnFunc: (token: number) => void;
  tradeTokenFunc: (from: number, to: number) => void;
  disableBtn: boolean;
}

const Card: React.FC<CardProps> = (props) => {

  const { token, tokenValue, mintFunc, burnFunc, tradeTokenFunc, disableBtn} = props;

  const BUTTON_THEME = "flex-1 rounded-md bg-blue-200 disabled:bg-gray-300 hover:bg-blue-400 active:bg-blue-600 p-2"

  return <div className="max-w-md p-6 flex flex-col bg-white rounded-md shadow-md flex-shrink-0">
    <span className="mb-4"><TokenText type={token} quantity={-1} /> : <span id="maticAmount" className="font-bold">{(Number(tokenValue) / 10**18)?.toString()}</span></span>
    <div className="flex flex-row gap-2 justify-between">
      <button className={BUTTON_THEME} disabled={disableBtn} onClick={async() => {mintFunc(token)}}>Mint</button>
      <button className={BUTTON_THEME} disabled={disableBtn || Number(tokenValue) == 0} onClick={async() => {burnFunc(token)}}>Burn</button>
    </div>
    <span className="my-2">Trade For 1 with 1</span>
    <div className="flex flex-col gap-2 justify-between">
      {token !== 0 && <button className={BUTTON_THEME} disabled={disableBtn || Number(tokenValue) == 0} onClick={async() => tradeTokenFunc(token, 0)}>{TOKEN_NAMES[0]}</button>}
      {token !== 1 && <button className={BUTTON_THEME} disabled={disableBtn || Number(tokenValue) == 0} onClick={async() => tradeTokenFunc(token, 1)}>{TOKEN_NAMES[1]}</button>}
      {token !== 2 && <button className={BUTTON_THEME} disabled={disableBtn || Number(tokenValue) == 0} onClick={async() => tradeTokenFunc(token, 2)}>{TOKEN_NAMES[2]}</button>}
    </div>
  </div>
}

interface TextProps {
    type: number;
    quantity: number;
}

const TokenText: React.FC<TextProps> = (props) => {
    const {type, quantity} = props

    const text = quantity >= 0 ? quantity.toString() + " " + TOKEN_NAMES[type] :
                                    TOKEN_NAMES[type]

    const textColor = type === 0 ? "text-red-500" :
                      type === 1 ? "text-green-500" :
                      type === 2 ? "text-blue-500" :
                      type === 3 ? "text-emerald-700" :
                      type === 4 ? "text-purple-500" :
                      type === 5 ? "text-amber-500" :
                      "text-purple-700"

    return <span className={textColor}><span className={"font-semibold"}>{text}</span></span>
}
