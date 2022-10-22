import {
  AbstractPaymentService,
  TransactionBaseService,
  Cart,
  Data,
  Payment,
  PaymentSession,
  PaymentSessionStatus,
  LineItem
} from "@medusajs/medusa";
import { EntityManager } from "typeorm";
import { Stripe } from "stripe";

class StripeService extends AbstractPaymentService<TransactionBaseService> {
  protected manager_: EntityManager;
  protected transactionManager_: EntityManager;

  static identifier = "Stripe";
  protected stripe: Stripe;

  constructor({}, options) {
    super(undefined, undefined);
    this.stripe = new Stripe(process.env.STRIPE_API_KEY, undefined);
  }

  async createPayment(cart: Cart): Promise<Data> {
    try {
      const shippingMethod = cart.shipping_methods[cart.shipping_methods.length - 1];
      const { STORE_CORS: storefrontHost } = process.env;
      const session = await this.stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${storefrontHost}/checkout?checkout_complete=true&cart=${cart.id}`,
        cancel_url: `${storefrontHost}`,
        client_reference_id: cart.id,
        line_items: [
          ...cart.items.map((item: LineItem) => {
            return {
              price_data: {
                currency: cart.region.currency_code,
                product_data: {
                  name: item.title,
                  description: item.variant.title,
                  images: [item.thumbnail]
                },
                unit_amount: item.unit_price,
              },
              quantity: item.quantity
            }
          })
        ],
        shipping_options: shippingMethod && [
          {
            shipping_rate_data: {
              display_name: `${shippingMethod.data.provider} - ${shippingMethod.data.servicelevel?.name}`,
              type: "fixed_amount",
              fixed_amount: {
                amount: shippingMethod.price,
                currency: cart.region.currency_code
              }
            }
          }
        ]
      });

      return {...session};
    } catch(err) {
      console.error(err);
      return {
        message: "Unable to create checkout session",
        error: JSON.stringify(err)
      };
    }
  }

  async retrievePayment(paymentData: Data): Promise<Data> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(`${paymentData.id}`);
      return {...session};
    } catch(err) {
      return {error: err};
    }
  }

  async getStatus(data: Data): Promise<PaymentSessionStatus> {
    try {
      if (data.object === "checkout.session") {
        const session = await this.stripe.checkout.sessions.retrieve(`${data.id}`);
        const { payment_status, status } = session;

        if (payment_status == "paid") {
          return PaymentSessionStatus.AUTHORIZED;
        } else if (payment_status == "unpaid" && status == "expired") {
          return PaymentSessionStatus.CANCELED;
        } else {
          return PaymentSessionStatus.PENDING;
        }
      } else if (data.object === "payment_intent") {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(`${data.id}`);
        const { status } = paymentIntent;

        if (status === "succeeded") {
          return PaymentSessionStatus.AUTHORIZED;
        } else if (status === "processing") {
          return PaymentSessionStatus.PENDING;
        } else if (status === "canceled") {
          return PaymentSessionStatus.CANCELED;
        } else {
          return PaymentSessionStatus.REQUIRES_MORE;
        }
      }
    } catch(err) {
      console.error(err);
      return PaymentSessionStatus.ERROR;
    }
  }

  async updatePayment(paymentSessionData: Data, cart: Cart): Promise<Data> {
    try {
      const session = await this.createPayment(cart);
      return session;
    } catch(err) {
      return {error: err};
    }
  }

  async updatePaymentData(paymentSessionData: Data, data: Data): Promise<Data> {
    return data;
  }

  async deletePayment(paymentSession: PaymentSession): Promise<void> {
    return;
  }

  async authorizePayment(paymentSession: PaymentSession, context: Data): Promise<{ data: Data; status: PaymentSessionStatus; }> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(`${paymentSession.data.id}`);

      if (session.payment_status === "paid") {
        return {
          status: PaymentSessionStatus.AUTHORIZED,
          data: {...session}
        };
      }

      return {
        status: PaymentSessionStatus.PENDING,
        data: {...session}
      }
    } catch(err) {
      return {
        status: PaymentSessionStatus.ERROR,
        data: {
          message: "Unable to retrieve checkout session",
          error: err,
          ...session
        }
      }
    }
  }

  async getPaymentData(paymentSession: PaymentSession): Promise<Data> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(`${paymentSession.data.payment_intent}`);
      return {...paymentIntent};
    } catch(err) {
      return {
        message: "Unable to retrieve payment intent",
        error: err,
        payment_intent: paymentSession.data.payment_intent
      }
    }
  }

  async capturePayment(payment: Payment): Promise<Data> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(`${payment.data.id}`);
      return {...paymentIntent};
    } catch(err) {
      return {
        message: "Payment capture attempt failed",
        error: err,
        ...payment.data
      }
    }
  }

  async refundPayment(payment: Payment, refundAmount: number): Promise<Data> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: `${payment.data.id}`,
        amount: refundAmount
      });

      return {...refund};
    } catch(err) {
      return {
        message: "Refund attempt failed",
        error: err,
        ...payment.data
      }
    }
  }

  async cancelPayment(payment: Payment): Promise<Data> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(`${payment.data.id}`);
      return {...paymentIntent};
    } catch(err) {
      return {
        message: "Payment cancellation failed",
        error: err,
        ...payment.data
      }
    }
  }
}

export default StripeService;