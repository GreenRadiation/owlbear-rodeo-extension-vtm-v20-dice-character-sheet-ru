# Кубы и лист персонажа V20 для Owlbear Rodeo

*An Owlbear Rodeo extension for Vampire: The Masquerade 20th Anniversary Edition: 3D d10 dice pools with success counting, a shared roll log and (later) a character sheet. Russian interface. Work in progress.*

Расширение для [Owlbear Rodeo](https://www.owlbear.rodeo/) под «Вампиры: Маскарад» юбилейной редакции (V20): 3D-кубы d10 с подсчётом успехов и ботчей, история бросков каждого игрока и лист персонажа, из которого набирается пул. Интерфейс на русском. Проект в разработке.

## Установка в Owlbear Rodeo

В профиле Owlbear Rodeo нажать Add Extension и вставить ссылку на манифест:

```
https://greenradiation.github.io/owlbear-rodeo-extension-vtm-v20-dice-character-sheet-ru/manifest.json
```

Потом включить расширение в настройках комнаты.

## На чём основано

Код основан на [Owlbear Rodeo Dice](https://github.com/owlbear-rodeo/dice) (Copyright (C) 2023 Owlbear Rodeo, GNU GPLv3): оттуда взяты 3D-кубы, физика, лоток и синхронизация бросков между игроками. История коммитов оригинала сохранена. Изменения относительно оригинала видны в истории после коммита `ccc32be`.

Списки названий для листа персонажа (дисциплины, кланы, достоинства и недостатки и другие) и формат файла листа взяты из [листа персонажа NtsDK](https://github.com/NtsDK/vtmcl) (Apache License 2.0), с которым совместимы импорт и экспорт. Названия следуют русскому изданию V20 от «Студии 101».

Стек: React, Three.js, Rapier, Vite, TypeScript, Owlbear Rodeo SDK.

## Сборка

Нужны Node.js и Yarn 1.

```
yarn
yarn dev
yarn build
```

Сборка и публикация в GitHub Pages идут автоматически через GitHub Actions при пуше в `main`.

Для разработки внутри Owlbear: запустить `yarn dev` и добавить в Owlbear расширение по адресу `http://localhost:5173/manifest.json`.

## Документы

- [docs/TASKS.md](docs/TASKS.md) — план работ.
- [CLAUDE.md](CLAUDE.md) — контекст проекта для Claude Code.

## Лицензия и оговорки

GNU GPLv3, см. [LICENSE](LICENSE). Vampire: The Masquerade — торговая марка Paradox Interactive. Это фанатский некоммерческий проект.
