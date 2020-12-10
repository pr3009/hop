export interface IProposalDetail {
  target: string
  functionSig: string
  callData: string
}

export interface IProposal {
  id: string
  title: string
  description: string
  proposer: string
  status: string
  forCount: number
  againstCount: number
  startBlock: number
  endBlock: number
  details: IProposalDetail[]
}