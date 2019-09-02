### sesify-tofu

This is the TOFU (trust-on-first-use) static and analysis tool used by sesify.

### security note

read access on a global object implies write access to its properties.

The following config implies write acess to `location.href`
```json
{
  "location": "read"
}
```