## Running application

#### 1.Create .env file

```
cp .env.example .env
```

#### 2.Create docker container for pg

```
npm run docker:run
```

#### 3.Generate migrations

```
npm run migration:generate
```

#### 4.Run migrations

```
npm run migration:run
```

#### 6. Run application

```
npm run start
