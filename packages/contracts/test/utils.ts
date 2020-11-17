import { ethers } from 'hardhat'
import { L2_NAMES } from './constants'
import { Contract } from 'ethers'

export const getL2MessengerId = (l2Name: string): string => {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(l2Name))
}

export const setMessengerWrapperDefaults = async (
  l2Name: string,
  l1MessengerWrapper: Contract,
  l1MessengerAddress: string,
  l2BridgeAddress: string
) => {

  await l1MessengerWrapper.setL1MessengerAddress(l1MessengerAddress)
  await l1MessengerWrapper.setL2BridgeAddress(l2BridgeAddress)

  if (l2Name === L2_NAMES.ARBITRUM) {
    return setArbitrumMessengerWrapperDefaults(l1MessengerWrapper)
  } else if (l2Name === L2_NAMES.OPTIMISM) {
    return setOptimismMessengerWrapperDefaults(l1MessengerWrapper)
  }

}

export const setArbitrumMessengerWrapperDefaults = async (l1MessengerWrapper: Contract) => {
  const arbChain: string = '0xC34Fd04E698dB75f8381BFA7298e8Ae379bFDA71'
  const defaultGasLimit: number = 1000000
  const defaultGasPrice: number = 0
  const defaultCallValue: number = 0
  const defaultSubMessageType: string = '0x01'

  await l1MessengerWrapper.setArbChain(arbChain)
  await l1MessengerWrapper.setDefaultGasLimit(defaultGasLimit)
  await l1MessengerWrapper.setDefaultGasPrice(defaultGasPrice)
  await l1MessengerWrapper.setDefaultCallValue(defaultCallValue)
  await l1MessengerWrapper.setDefaultSubMessageType(defaultSubMessageType)
}

export const setOptimismMessengerWrapperDefaults = async (l1MessengerWrapper: Contract) => {
  const defaultGasLimit: number = 1000000

  await l1MessengerWrapper.setDefaultGasLimit(defaultGasLimit)
}