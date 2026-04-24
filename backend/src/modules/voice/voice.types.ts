export interface TwilioVoiceWebhookBody {
  CallSid: string;
  From: string;
  To: string;
  CallStatus?: string;
}

export interface RestaurantContext {
  id: string;
  name: string;
  isBusy: boolean;
  busyExtraMinutes: number;
  acceptingOrders: boolean;
}

export interface TwilioStreamStartEvent {
  event: "start";
  start: {
    streamSid: string;
    callSid: string;
    customParameters: Record<string, string>;
  };
}

export interface TwilioStreamMediaEvent {
  event: "media";
  media: {
    payload: string; // base64-encoded audio
  };
}

export interface TwilioStreamStopEvent {
  event: "stop";
}

export type TwilioStreamEvent =
  | TwilioStreamStartEvent
  | TwilioStreamMediaEvent
  | TwilioStreamStopEvent
  | { event: "connected" | "mark"; [key: string]: unknown };

export interface SearchNumbersQuery {
  country: string;
  areaCode?: number;
}

export interface ProvisionNumberBody {
  restaurantId: string;
  phoneNumber: string;
}
