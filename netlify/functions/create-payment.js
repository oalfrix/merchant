exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method not allowed"
      })
    };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    const {
      order_id,
      amount,
      currency,
      customer_phone,
      customer_name,
      customer_email,
      description,
      product_id,
      product_name
    } = data;

    if (!order_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "order_id is required"
        })
      };
    }

    if (!amount || Number(amount) <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid amount"
        })
      };
    }

    if (!customer_phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Phone number is required"
        })
      };
    }

    // These are server-side Netlify environment variables.
    const CENTRAL_API_URL =
      process.env.CENTRAL_API_URL ||
      "https://lxrdkforhtiudmghydqx.supabase.co/functions/v1/central-create-payment";

    const MERCHANT_API_KEY =
      process.env.MERCHANT_API_KEY;

    if (!MERCHANT_API_KEY) {
      console.error("MERCHANT_API_KEY is not configured");

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Payment service is not configured"
        })
      };
    }

    const response = await fetch(CENTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": MERCHANT_API_KEY
      },
      body: JSON.stringify({
        order_id,
        amount: Number(amount),
        currency: currency || "KES",
        customer_phone,
        customer_name: customer_name || "",
        customer_email: customer_email || "",
        description: description || product_name || "Payment",
        metadata: {
          product_id: product_id || null,
          product_name: product_name || null
        }
      })
    });

    const result = await response.json();

    console.log("Central payment response:", {
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: result.error || "Central payment API rejected the request"
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        payment_id: result.payment_id,
        order_tracking_id: result.order_tracking_id,
        merchant_reference: result.merchant_reference,
        checkout_url: result.checkout_url
      })
    };

  } catch (error) {

    console.error("Create payment error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Unable to start payment"
      })
    };
  }
};