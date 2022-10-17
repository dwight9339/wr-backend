import axios from "axios";
import { FulfillmentOption } from "@medusajs/medusa";
import { FulfillmentService } from "medusa-interfaces";

class ShippoFulfillmentService extends FulfillmentService {
  static identifier = "Shippo"

  async getFulfillmentOptions() {
    return [
      {
        id: "Shippo"
      }
    ]
  }

  async validateOption(data: any): Promise<boolean> {
    return true;
  }

  async canCalculate(data: any): Promise<boolean> {
    return true;
  }

  async calculatePrice(optionData: object, requestData: any, cart: object) {
    return requestData.price;
  }

  async validateFulfillmentData(optionData: object, data: any, cart: object) {
    return {...data};
  }

  async createFulfillment(data: any, items: any, order: any, fulfillment: any) {
    await axios.post("https://api.goshippo.com/transactions", {
      rate: data.rate.object_id,
    });
  }
}

export default ShippoFulfillmentService;