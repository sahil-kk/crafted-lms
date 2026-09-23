"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { PaymentObj } from "./useAppData";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface InitiatePaymentParams {
  payment: PaymentObj;
  onSuccess?: (updatedPayment: PaymentObj) => void;
  onError?: (error: Error) => void;
  onDismiss?: () => void;
}

export function useRazorpay() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  const initiatePayment = useCallback(
    async ({ payment, onSuccess, onError, onDismiss }: InitiatePaymentParams) => {
      const paymentId = payment._id || payment.id;
      if (!paymentId) {
        toast.error("Invalid payment reference");
        return;
      }

      setIsProcessing(true);
      setProcessingPaymentId(paymentId);

      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Failed to load Razorpay payment gateway. Please check your internet connection.");
        }

        // Create order on server
        const orderData = await apiClient<{
          orderId: string;
          amount: number;
          currency: string;
          keyId: string;
          payment: any;
        }>("/payments/razorpay/create-order", {
          method: "POST",
          body: JSON.stringify({ paymentId }),
        });

        if (!orderData.orderId) {
          throw new Error("Failed to initiate order with Razorpay.");
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          name: "Crafted Learning Hub",
          description: `Fee Payment - ${payment.classGrade || "Tuition / Course Fee"}`,
          image: "/favicon.ico",
          order_id: orderData.orderId,
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            try {
              toast.loading("Verifying payment with secure server...", { id: "razorpay-verify" });
              const verifyRes = await apiClient<{
                success: boolean;
                message: string;
                payment: PaymentObj;
              }>("/payments/razorpay/verify", {
                method: "POST",
                body: JSON.stringify({
                  paymentId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              toast.dismiss("razorpay-verify");

              if (verifyRes.success) {
                toast.success("Payment completed successfully!");
                onSuccess?.(verifyRes.payment);
              } else {
                toast.error(verifyRes.message || "Payment verification failed.");
                onError?.(new Error(verifyRes.message));
              }
            } catch (err: any) {
              toast.dismiss("razorpay-verify");
              toast.error(err.message || "Payment verification request failed.");
              onError?.(err);
            } finally {
              setIsProcessing(false);
              setProcessingPaymentId(null);
            }
          },
          prefill: {
            name: payment.studentName,
          },
          notes: {
            paymentId: paymentId,
            studentName: payment.studentName,
          },
          theme: {
            color: "#f97316", // Crafted LMS brand orange
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              setProcessingPaymentId(null);
              onDismiss?.();
            },
          },
        };

        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.on("payment.failed", function (response: any) {
          toast.error(response.error?.description || "Payment failed. Please try again.");
          onError?.(new Error(response.error?.description || "Payment failed"));
          setIsProcessing(false);
          setProcessingPaymentId(null);
        });

        razorpayInstance.open();
      } catch (err: any) {
        setIsProcessing(false);
        setProcessingPaymentId(null);
        toast.error(err.message || "Could not launch Razorpay checkout.");
        onError?.(err);
      }
    },
    []
  );

  /**
   * Generic Razorpay checkout supporting arbitrary amounts (e.g. course enrollments or direct payments)
   */
  const initiateCheckout = useCallback(
    async ({
      amount,
      currency = "INR",
      name = "Crafted Learning Hub",
      description = "Online Payment",
      receipt,
      prefill,
      onSuccess,
      onError,
      onDismiss,
    }: {
      amount: number; // in Rupees
      currency?: string;
      name?: string;
      description?: string;
      receipt?: string;
      prefill?: { name?: string; email?: string; contact?: string };
      onSuccess?: (verifyRes: any) => void;
      onError?: (error: Error) => void;
      onDismiss?: () => void;
    }) => {
      setIsProcessing(true);
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Failed to load Razorpay SDK. Please check your connection.");
        }

        // Call /api/create-order
        const orderRes = await apiClient<{
          order_id: string;
          amount: number;
          currency: string;
          key_id: string;
        }>("/create-order", {
          method: "POST",
          body: JSON.stringify({
            amount: Math.round(amount * 100), // paise
            currency,
            receipt,
          }),
        });

        if (!orderRes.order_id) {
          throw new Error("Failed to generate order ID");
        }

        const options = {
          key: orderRes.key_id,
          amount: orderRes.amount,
          currency: orderRes.currency,
          name,
          description,
          image: "/favicon.ico",
          order_id: orderRes.order_id,
          prefill: prefill || {},
          theme: { color: "#f97316" },
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            try {
              toast.loading("Verifying payment...", { id: "checkout-verify" });
              const verifyRes = await apiClient<any>("/verify-payment", {
                method: "POST",
                body: JSON.stringify({
                  order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              toast.dismiss("checkout-verify");
              if (verifyRes.success) {
                toast.success("Payment verified successfully!");
                onSuccess?.(verifyRes);
              } else {
                toast.error(verifyRes.message || "Signature verification failed");
                onError?.(new Error(verifyRes.message));
              }
            } catch (err: any) {
              toast.dismiss("checkout-verify");
              toast.error(err.message || "Failed to verify payment");
              onError?.(err);
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              onDismiss?.();
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (resp: any) {
          toast.error(resp.error?.description || "Payment failed");
          onError?.(new Error(resp.error?.description || "Payment failed"));
          setIsProcessing(false);
        });
        rzp.open();
      } catch (err: any) {
        setIsProcessing(false);
        toast.error(err.message || "Error opening checkout");
        onError?.(err);
      }
    },
    []
  );

  return {
    initiatePayment,
    initiateCheckout,
    isProcessing,
    processingPaymentId,
  };
}
