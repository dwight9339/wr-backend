import { Router } from "express";
import { CustomerService, Customer } from "@medusajs/medusa";
import { FindConfig } from "@medusajs/medusa/dist/types/common";
import cors from "cors";
import { projectConfig } from "../../medusa-config";

const anonymousCustomerEmail = "anonymous.customer@fakedomain.com";

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
  
  return router;
}