# Terraform – Sprint 2 minta

Minimális, plan‑képes példa. Cél: `terraform validate` és `terraform plan` siker.

Lépések (helyben):
```
terraform init
terraform validate
terraform plan -out=plan.out
```

CI‑ban a `plan.out` artefaktot mentsd el (például `infra/terraform/plan.out`).

