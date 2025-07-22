"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, eachWeekOfInterval, subMonths } from "date-fns";

interface TokenData {
  id: string;
  createdAt: Date;
  invoiceId: string;
  operationType: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost: string | null;
  costUnit: string | null;
  modelUsed: string | null;
  cachedTokens: number | null;
  invoiceNumber: string;
  vendorName: string;
  customerName: string;
  invoiceAmount: string;
}

interface TokenUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface AggregatedData {
  week: string;
  totalTokens: number;
  totalCost: number;
  invoiceCount: number;
}

interface InvoiceMetrics {
  totalInvoices: number;
  averageTokensPerInvoice: number;
  averageCostPerInvoice: number;
  totalTokensUsed: number;
  totalCostIncurred: number;
}

export default function TokenUsageModal({
  isOpen,
  onClose,
  userId,
}: TokenUsageModalProps) {
  const [tokenData, setTokenData] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<InvoiceMetrics | null>(null);
  const [weeklyData, setWeeklyData] = useState<AggregatedData[]>([]);

  const fetchTokenData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/tokens`);
      if (!response.ok) throw new Error("Failed to fetch token data");

      const data = await response.json();

      // Convert date strings to Date objects and ensure numeric types
      const processedData = data.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        inputTokens: item.inputTokens || 0,
        outputTokens: item.outputTokens || 0,
        totalTokens: item.totalTokens || 0,
        cost: item.cost ? parseFloat(item.cost) : 0,
        cachedTokens: item.cachedTokens || 0,
      }));

      setTokenData(processedData);
      calculateMetrics(processedData);
      calculateWeeklyData(processedData);
    } catch (error) {
      console.error("Error fetching token data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const calculateMetrics = (data: TokenData[]) => {
    const uniqueInvoices = new Set(data.map((item) => item.invoiceId));
    const totalInvoices = uniqueInvoices.size;
    const totalTokensUsed = data.reduce(
      (sum, item) => sum + (item.totalTokens || 0),
      0
    );
    const totalCostIncurred = data.reduce(
      (sum, item) => sum + (parseFloat(item.cost?.toString() || "0") || 0),
      0
    );

    const metrics: InvoiceMetrics = {
      totalInvoices,
      averageTokensPerInvoice:
        totalInvoices > 0 ? totalTokensUsed / totalInvoices : 0,
      averageCostPerInvoice:
        totalInvoices > 0 ? totalCostIncurred / totalInvoices : 0,
      totalTokensUsed,
      totalCostIncurred,
    };

    setMetrics(metrics);
  };

  const calculateWeeklyData = (data: TokenData[]) => {
    const threeMonthsAgo = subMonths(new Date(), 3);
    const weeks = eachWeekOfInterval({
      start: threeMonthsAgo,
      end: new Date(),
    });

    const weeklyAggregated: AggregatedData[] = weeks.map((weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekData = data.filter((item) => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= weekStart && itemDate <= weekEnd;
      });

      const uniqueInvoices = new Set(weekData.map((item) => item.invoiceId));

      return {
        week: format(weekStart, "MMM dd"),
        totalTokens: weekData.reduce(
          (sum, item) => sum + (item.totalTokens || 0),
          0
        ),
        totalCost: weekData.reduce(
          (sum, item) => sum + (parseFloat(item.cost?.toString() || "0") || 0),
          0
        ),
        invoiceCount: uniqueInvoices.size,
      };
    });

    // Calculate running averages
    const weeklyWithAverages = weeklyAggregated.map((week, index) => {
      const previousWeeks = weeklyAggregated.slice(
        Math.max(0, index - 2),
        index + 1
      );
      const avgTokens =
        previousWeeks.reduce((sum, w) => sum + w.totalTokens, 0) /
        previousWeeks.length;
      const avgCost =
        previousWeeks.reduce((sum, w) => sum + w.totalCost, 0) /
        previousWeeks.length;

      return {
        ...week,
        avgTokens: Math.round(avgTokens),
        avgCost: parseFloat(avgCost.toFixed(2)),
      };
    });

    setWeeklyData(weeklyWithAverages);
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchTokenData();
    }
  }, [isOpen, userId, fetchTokenData]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Token Usage Analytics</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg">Loading token data...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Metrics Cards */}
              {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <Card className="p-4">
                    <div className="text-sm text-gray-600">Total Invoices</div>
                    <div className="text-2xl font-bold">
                      {metrics.totalInvoices}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-gray-600">Total Tokens</div>
                    <div className="text-2xl font-bold">
                      {metrics.totalTokensUsed.toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-gray-600">Total Cost</div>
                    <div className="text-2xl font-bold">
                      ${metrics.totalCostIncurred.toFixed(2)}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-gray-600">
                      Avg Tokens/Invoice
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(
                        metrics.averageTokensPerInvoice
                      ).toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-gray-600">
                      Avg Cost/Invoice
                    </div>
                    <div className="text-2xl font-bold">
                      ${metrics.averageCostPerInvoice.toFixed(2)}
                    </div>
                  </Card>
                </div>
              )}

              {/* Weekly Running Average Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Weekly Running Average - Token Usage
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          name === "avgTokens"
                            ? `${value.toLocaleString()} tokens`
                            : `$${value}`,
                          name === "avgTokens" ? "Avg Tokens" : "Avg Cost",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgTokens"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="avgTokens"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Weekly Running Average Chart - Cost */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Weekly Running Average - Cost
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any) => [`$${value}`, "Avg Cost"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgCost"
                        stroke="#82ca9d"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Token Usage Table */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Token Usage Details
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">
                          Date
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-left">
                          Invoice #
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-left">
                          Vendor
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-left">
                          Operation
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-right">
                          Input Tokens
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-right">
                          Output Tokens
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-right">
                          Total Tokens
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-right">
                          Cost
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-left">
                          Model
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenData.map((token) => (
                        <tr key={token.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">
                            {format(
                              new Date(token.createdAt),
                              "MMM dd, yyyy HH:mm"
                            )}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {token.invoiceNumber}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {token.vendorName}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {token.operationType}
                            </span>
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            {token.inputTokens?.toLocaleString() || 0}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            {token.outputTokens?.toLocaleString() || 0}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-semibold">
                            {token.totalTokens?.toLocaleString() || 0}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-semibold">
                            $
                            {parseFloat(token.cost?.toString() || "0").toFixed(
                              4
                            )}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm">
                            {token.modelUsed || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tokenData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No token usage data found for the last 3 months.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
