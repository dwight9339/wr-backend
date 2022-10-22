import { Router, raw } from "express";
import { CustomerService, Customer, Payment } from "@medusajs/medusa";
import cors from "cors";
import { projectConfig } from "../../medusa-config";
import { Stripe } from "stripe";
import { CartService, OrderService } from "@medusajs/medusa/dist/services";

const anonymousCustomerEmail = "anonymous.customer@fakedomain.com";
const stripe = new Stripe(process.env.STRIPE_API_KEY, undefined);

export default () => {
  const router = Router();
  const corsOptions = {
    origin: projectConfig.store_cors.split(","),
    credentials: true
  };
  
  router.options("/store/customers/anonymous", cors(corsOptions));
  router.get("/store/customers/anonymous", cors(corsOptions), (req, res) => {
    const customerService: CustomerService = req.scope.resolve("customerService");
    customerService.retrieveByEmail(anonymousCustomerEmail).then((customer) => {
      res.status(200).json({customer});
    }).catch((err) => {
      if (err.type === "not_found") {
        customerService.create({
          first_name: "Anonymous",
          last_name: "Customer",
          email: anonymousCustomerEmail,
          password: "password",
          has_account: false
        }).then((customer) => {
          res.status(200).json({customer});
        }).catch((err) => {
          console.error(err);
          res.status(500).send(err);
        })
      } else {
        res.status(err.status || 500).send(err);
      }
    });
  })

  router.post("/webhooks/stripe-checkout", raw({type: "application/json"}), async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      const { data } = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
      // const cartId = data.object.client_reference_id;
      // const cartService: CartService = req.scope.resolve("cartService");
      // const orderService: OrderService = req.scope.resolve("orderService");

      // cartService.updatePaymentSession(cartId, {...data}).then(() => {
      //   cartService.authorizePayment(cartId).then((cart) => {
      //     console.log(`Authorized cart: ${JSON.stringify(cart)}`);
      //     orderService.createFromCart(cartId);
      //   })
      // }, (reason) => {
      //   throw reason;
      // })

      // res.status(200).send();
    } catch(err) {
      console.error(err);
      res.status(err.status || 500).send(err);
    }
  })
  
  return router;
}