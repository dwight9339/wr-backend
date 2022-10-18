import { Router } from "express";
import { CustomerService, Customer } from "@medusajs/medusa";
import { FindConfig } from "@medusajs/medusa/dist/types/common";

const anonymousCustomerEmail = "anonymous.customer@fakedomain.com";

export default () => {
  const router = Router();

  router.get("/store/customers/anonymous", (req, res) => {
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
  
  return router;
}