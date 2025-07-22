import { myProvider } from "../ai/models";

export interface CostModel {
  input: number;
  output: number;
}

export class ModelPricer {
  private static modelPrices: Record<string, CostModel> = {
    [myProvider.languageModel('chat-model-large').modelId]: { input: 5, output: 20 },
    [myProvider.languageModel('chat-model-small').modelId]: { input: 0.60, output: 2.40 },
  };

  private static costDivisor = 1000000; // 1 million tokens

  constructor() {}

  static getPrice(modelName: string): CostModel | null {
    return this.modelPrices[modelName] || null;
  }

  static setPrice(modelName: string, price: CostModel): void {
    this.modelPrices[modelName] = price;
  }

  public static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costModel = this.getPrice(model);
    if (!costModel) return 0;

    const inputCost = (inputTokens * costModel.input) / this.costDivisor;
    const outputCost = (outputTokens * costModel.output) / this.costDivisor;

    return inputCost + outputCost;
  }
}
