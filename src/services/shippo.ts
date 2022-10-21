import axios from "axios";
import { FulfillmentService } from "medusa-interfaces";

class ShippoFulfillmentService extends FulfillmentService {
  static identifier = "shippo"

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
    console.log("In create fulfillment");
    try {
      const { data: axiosData } = await axios.post("https://api.goshippo.com/transactions", {
        rate: data.object_id,
      }, {
        headers: {
          "Authorization": `ShippoToken ${process.env.SHIPPO_API_KEY}`
        }
      });
      console.log(`Shippo transaction data: ${JSON.stringify(axiosData)}`);
      return axiosData;
    } catch(err) {
      console.error(err);
      return { error: JSON.stringify(err) };
    }
  }
}

export default ShippoFulfillmentService;