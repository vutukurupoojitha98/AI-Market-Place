package com.minimart.service.payment;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Payment adapter — Strategy pattern.
 * Implementations: {@link StripePaymentAdapter}, RevolutPaymentAdapter, ApplePayAdapter, GooglePayAdapter.
 * Swap without touching business logic (Order service).
 */
public interface PaymentAdapter {
    CheckoutResponse createCheckout(
        BigDecimal amount, String currency,
        String successUrl, String cancelUrl,
        Map<String, String> metadata
    );
    PaymentStatus getStatus(String sessionId);

    record CheckoutResponse(String url, String sessionId) {}
    record PaymentStatus(String status, String paymentStatus, long amountCents, String currency) {}
}
