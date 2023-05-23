import axios from 'axios';

function buildUrl(path: string) {
  return `http://localhost:8080${path}`;
}

export async function postCall(
  path: string,
  data: any,
  headers: any
): Promise<any> {
  console.log('POST', buildUrl(path), JSON.stringify(data), headers);
  return await axios
    .post(buildUrl(path), JSON.stringify(data), {
      headers: headers || {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    .then((res) => {
      return res.data;
    })
    .catch((error) => {
      console.error(error);
    });
}
