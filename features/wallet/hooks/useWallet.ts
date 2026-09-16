import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { CoinWallet, CoinTransaction } from "../types";
import { CoinService } from "../services/coinService";

export interface UseWalletReturn {
  wallet: CoinWallet | null;
  coinBalance: number;
  transactions: CoinTransaction[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to consume active child's coin wallet balance and recent transactions.
 * Automatically refreshes on screen focus (e.g. when returning to Home from Lesson Results).
 */
export function useWallet(): UseWalletReturn {
  const { profile } = useActiveProfile();
  const [wallet, setWallet] = useState<CoinWallet | null>(null);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const profileId = profile?.id;

  const loadWallet = useCallback(async () => {
    if (!profileId) {
      setWallet(null);
      setCoinBalance(0);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    try {
      const [walletData, txs] = await Promise.all([
        CoinService.getWallet(profileId),
        CoinService.getCoinTransactions(profileId, 20),
      ]);
      setWallet(walletData);
      setCoinBalance(walletData.coinBalance);
      setTransactions(txs);
    } catch (err) {
      console.warn("[useWallet] Error loading wallet:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    setIsLoading(true);
    loadWallet();
  }, [loadWallet]);

  useFocusEffect(
    useCallback(() => {
      loadWallet();
    }, [loadWallet])
  );

  return {
    wallet,
    coinBalance,
    transactions,
    isLoading,
    refresh: loadWallet,
  };
}
