### sesify-tofu

This is the TOFU (trust-on-first-use) static analysis tool used by sesify to automatically generate useable config

### security note

read access on a global object implies write access to its properties.

The following config implies write acess to `location.href`
```json
{
  "location": "read"
}
```