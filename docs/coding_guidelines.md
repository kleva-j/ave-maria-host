## Coding Guidelines

---

### Table of Contexts

- General
- New Project
- Typescript/Javascript
- Testing
- Databases
- CI/CD & Scripts
- Web
- Changes to this doc

### General

- These are not to be blindly followed; strive to understand these and ask
  when in doubt. Sometimes standards are a bad idea.

- Don't duplicate the functionality of a built-in library.

- Really try hard not to duplicate the functionality of an existing maintained library or function. If this means making a new repo to share across projects... please do that... even if it's a simple function.

- Don't swallow exceptions or "fail silently".

- Don't write code that guesses at future functionality. (Don't be an architecture astronaut)

- Use callbacks, passed objects and/or split the repo up into multiple repos to prevent tight coupling across directory boundaries. Especially avoid cross-importing.

- Never use IPC where importing a class will work. If that class comes with too much baggage, break it up and import the stuff you need.

- Strive to adhere to the Unix Philosophy. There are some nice articles that discuss this philosophy as applied to object oriented code:

### New Project

- Start new projects with Typescript

- Master branch must require code reviews and passing tests

- All new projects must have a full CI pipeline, including linters, tests

- If a project has dependencies, it must use and commit a lockfile of some sort

### Typescript/Javascript

- Use maps, not objects, as much as possible.

### Testing

### Databases (relational)

- Index foreign keys.

- Constrain most columns as [NOT NULL].

- Never put meaningful or computed data in the "id" or "primary key" field of a table.

### Web

- Avoid rendering delays caused by synchronous javascript hits.

- Use HTTPS instead of HTTP when linking to assets.

- Use UTF-8 only

### Changes to this doc

To add new standards:

- First make sure your proposal doesn't suck. Coding standards that suck have the following attributes:

- Full of author's own opinions and personal coding style.

- Huge focus on style and formatting issues

- Recommendations disguised as standards.
