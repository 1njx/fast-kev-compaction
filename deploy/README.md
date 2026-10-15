# Deploying Kev to Modal

`kev_serve.py` is [Kev](https://github.com/jaredpalmer/kev)'s Modal app, copied from upstream (pinned to the
commit in `KEV_REF`) with one change: `scaledown_window` is 60 s instead of 300 s, because a compaction is one
burst and an idle GPU costs money.

```sh
pip install modal==1.5.5
modal setup
KEV_API_KEY=<long random key> KEV_MODEL=jaredpalmer/kev-27b modal deploy deploy/kev_serve.py
```

- Endpoint: `https://<workspace>--kev-api.modal.run` (System One at `/v1/systemone`, health at `/v1/models`).
- First start downloads about 51 GB of weights into the `kev-hf-cache` volume and takes about 5 to 6 minutes.
  Later cold starts take 1 to 3 minutes.
- Check it: `curl -L --max-time 900 https://<workspace>--kev-api.modal.run/v1/models -H "authorization: Bearer $KEV_API_KEY"`
- Stop it: `modal app stop kev`.
- Redeploying with a different `KEV_API_KEY` changes the key the plugin must use.
- Cost: set a $0 spend limit in Modal's billing settings. Volume storage (51 GB) stays under the free tier.
- Smaller models: `KEV_MODEL=jaredpalmer/kev-9b` (or `kev-4b`, `kev-0.8b`) uses a cheaper GPU.
