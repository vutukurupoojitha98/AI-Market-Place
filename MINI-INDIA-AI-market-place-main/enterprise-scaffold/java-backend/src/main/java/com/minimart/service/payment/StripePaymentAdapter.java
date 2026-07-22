package com.minimart.service.payment;

import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StripePaymentAdapter implements PaymentAdapter {

    @Value("${app.stripe.api-key}") private String apiKey;

    @PostConstruct
    void init() { Stripe.apiKey = apiKey; }

    @Override
    public CheckoutResponse createCheckout(BigDecimal amount, String currency,
                                           String successUrl, String cancelUrl,
                                           Map<String, String> metadata) {
        try {
            SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .addLineItem(SessionCreateParams.LineItem.builder()
                    .setQuantity(1L)
                    .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                        .setCurrency(currency.toLowerCase())
                        .setUnitAmount(amount.multiply(BigDecimal.valueOf(100)).longValueExact())
                        .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName("Mini Mart Order").build())
                        .build())
                    .build())
                .putAllMetadata(metadata)
                .build();
            Session s = Session.create(params);
            return new CheckoutResponse(s.getUrl(), s.getId());
        } catch (Exception e) {
            throw new RuntimeException("Stripe checkout failed", e);
        }
    }

    @Override
    public PaymentStatus getStatus(String sessionId) {
        try {
            Session s = Session.retrieve(sessionId);
            return new PaymentStatus(s.getStatus(), s.getPaymentStatus(),
                                     s.getAmountTotal(), s.getCurrency());
        } catch (Exception e) { throw new RuntimeException(e); }
    }
}
