export interface BudgetLimits {
	dailyTokenCeiling?: number;
	tokensPerMinute?: number;
}

/**
 * BudgetManager tracks token consumption and enforces limits (Section 20).
 */
export class BudgetManager {
	private consumedTokensToday = 0;
	private dailyTokenCeiling: number;
	private tokensPerMinute: number;

	constructor(limits?: BudgetLimits) {
		this.dailyTokenCeiling = limits?.dailyTokenCeiling ?? 200000;
		this.tokensPerMinute = limits?.tokensPerMinute ?? 8000;
	}

	public canAfford(estimatedTokens: number): boolean {
		return (this.consumedTokensToday + estimatedTokens) <= this.dailyTokenCeiling;
	}

	public recordUsage(actualTokens: number): void {
		this.consumedTokensToday += actualTokens;
	}

	public getTokensConsumedToday(): number {
		return this.consumedTokensToday;
	}

	public getRemainingTokensToday(): number {
		return Math.max(0, this.dailyTokenCeiling - this.consumedTokensToday);
	}
}
