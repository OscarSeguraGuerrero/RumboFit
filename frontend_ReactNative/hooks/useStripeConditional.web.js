export const useStripeConditional = () => {
    return {
        initPaymentSheet: async () => ({ error: { message: "No disponible en web" } }),
        presentPaymentSheet: async () => ({ error: { message: "No disponible en web" } }),
    };
};
