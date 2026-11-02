
```sh
aws eks update-kubeconfig --region us-east-2 --name 
export AWS_PROFILE=terraform   
```

```sh
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```