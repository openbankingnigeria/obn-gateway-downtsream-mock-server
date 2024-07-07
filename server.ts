import * as express from 'express';
import axios from 'axios';
import {
  Collection,
  Item,
  ItemGroup,
  Response as PostmanResponse,
} from 'postman-collection';

const app = express();
const PORT = 4321;

let collection: Collection | null = null;

// Function to get the example response from a request item
const getExampleResponse = (item: Item): PostmanResponse | null => {
  const responses = item.responses;
  if (responses && responses.count() > 0) {
    // TODO filter by query; if request query is empty, or :query or {{query}}
    // Returning the first example response found
    const response = responses.idx(0);
    if (!response.body) {
      return null;
    }
    return response;
  }
  return null;
};

// Function to set up routes based on the Postman collection
const setupRoutes = (collection: Collection | ItemGroup<Item>): void => {
  collection.items.each((item: Item) => {
    if (item.request) {
      const method = item.request.method.toLowerCase() as
        | 'get'
        | 'post'
        | 'put'
        | 'patch'
        | 'delete';
      const route = item.request.url.getPath();
      app[method](route, (req: express.Request, res: express.Response) => {
        try {
          const exampleResponse = getExampleResponse(item);
          if (exampleResponse) {
            res.status(exampleResponse.code);
            exampleResponse.headers.each((header) => {
              res.set(header.key, header.value);
            });
            res.send(exampleResponse.body);
          } else {
            res.status(404).json({
              status: '25',
              message: 'Example response not found',
            });
          }
        } catch (error) {
          res.status(500).json({
            status: '96',
            message: error.message,
          });
        }
      });
    } else if (item instanceof ItemGroup) {
      setupRoutes(item); // Recursively set up routes for sub-folders
    }
  });
};

(async () => {
  try {
    const schemaResponse = await axios.get('https://apis.openbanking.ng/', {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    const { collectionId, publishedId } = schemaResponse.data.collection.info;

    const collectionResponse = await axios.get(
      `https://apis.openbanking.ng/api/collections/${collectionId}/${publishedId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      },
    );

    collection = new Collection(collectionResponse.data);
    setupRoutes(collection);
  } catch (error) {
    console.error('Error fetching collection:', error);
  }
})();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
