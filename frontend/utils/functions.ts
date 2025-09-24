export const tools = [
  {
    type: "function",
    name: "search_restaurants",
    description: "Restoranı ada göre ara. Eğer name verilmezse tüm restoranları döndür.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" }
      }
    }
  },
  {
    type: "function",
    name: "get_menu",
    description: "Verilen restoran ID’sine ait menüyü döndür.",
    parameters: {
      type: "object",
      properties: {
        restaurantId: { type: "string" }
      },
      required: ["restaurantId"]
    }
  },
  {
    type: "function",
    name: "create_order",
    description: "Sipariş oluştur. Kullanıcının seçtiği yemeklerden sipariş yarat.",
    parameters: {
      type: "object",
      properties: {
        customer: { type: "string" },
        address: { type: "string" },
        restaurantId: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              foodId: { type: "string" },
              quantity: { type: "integer" }
            },
            required: ["foodId", "quantity"]
          }
        }
      },
      required: ["customer", "address", "restaurantId", "items"]
    }
  }
];