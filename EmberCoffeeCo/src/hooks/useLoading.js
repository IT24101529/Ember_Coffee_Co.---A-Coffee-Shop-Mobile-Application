import { useState, useCallback } from 'react';

/**
 * Shared loading state hook.
 *
 * Returns:
 *   loading    — boolean, true while an async operation is in flight
 *   setLoading — manual setter (for cases where you manage loading yourself)
 *   withLoading(asyncFn) — wraps an async function so that `loading` is
 *                          automatically set to true before it runs and
 *                          false when it resolves or rejects.
 *
 * Usage:
 *   const { loading, withLoading } = useLoading();
 *
 *   const fetchData = withLoading(async () => {
 *     const res = await axios.get('/api/products');
 *     setProducts(res.data);
 *   });
 *
 *   useEffect(() => { fetchData(); }, []);
 */
export default function useLoading(initialState = false) {
  const [loading, setLoading] = useState(initialState);

  const withLoading = useCallback(
    (asyncFn) =>
      async (...args) => {
        setLoading(true);
        try {
          return await asyncFn(...args);
        } finally {
          setLoading(false);
        }
      },
    [],
  );

  return { loading, setLoading, withLoading };
}
