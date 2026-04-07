const GAS_URL =
  "https://script.google.com/macros/s/AKfycbxJQ_GSE_bJQYZPSvGe4K4Ar4Z65YBOhhFEuoOeRZh9ZNxc7n5ePxpLR5rVjLvcgWaMYg/exec";

/**
 * Fetch data from GAS backend
 * @param {string} type - data type to fetch (e.g., 'daily', 'task', 'note', 'journal')
 * @param {object} params - additional query parameters
 */
export async function fetchData(type, params = {}) {
  try {
    const url = new URL(GAS_URL);
    url.searchParams.set("type", type);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      mode: "cors",
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`fetchData(${type}) failed:`, error);
    return null;
  }
}

/**
 * Save data to GAS backend
 * @param {string} type - data type to save
 * @param {Array|object} items - data to save
 */
export async function saveData(type, items) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({ type, items }),
    });

    // no-cors returns opaque response (status 0, empty body)
    // GAS processes the request server-side regardless
    if (response.type === "opaque") {
      return { success: true, type, count: items.length };
    }

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`saveData(${type}) failed:`, error);
    return null;
  }
}
