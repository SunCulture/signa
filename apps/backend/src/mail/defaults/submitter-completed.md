---
subject: "{template.name} has been completed by {submission.submitters}"
variables:
  - template.name
  - submission.submitters
  - submission.link
---
Hi,

"{template.name}" has been completed by {submission.submitters}.

[Open submission]({submission.link})
