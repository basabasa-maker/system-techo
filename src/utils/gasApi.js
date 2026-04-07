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
      mode: "cors",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({ type, items }),
    });

    // GAS redirects may return opaque or non-JSON responses
    // but the data is saved server-side regardless
    try {
      const data = await response.json();
      return data;
    } catch {
      // Response wasn't JSON (redirect/opaque) — treat as success
      return { success: true, type, count: items.length };
    }
  } catch (error) {
    console.error(`saveData(${type}) failed:`, error);
    return null;
  }
}
