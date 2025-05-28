import {graphiqlLoader} from '@shopify/hydrogen';
import {redirect} from '@shopify/remix-oxygen';

const forceEnableGraphiQL = true;

export async function loader(args) {
  const {context} = args;
  if (context.env.NODE_ENV === 'development' || forceEnableGraphiQL) {
    // Default Hydrogen GraphiQL behavior
    return graphiqlLoader(args);
  }

  return redirect('/');
}
