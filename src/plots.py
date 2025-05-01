import matplotlib.pyplot as plt
import ast

# Чтение данных из файла (ваш исправленный код)
path = r'E:\My_Programs\study\degree_bak\rcss-fuzzy-agent\best_try\\'
filename = r'compare.txt'
full_path = path + filename

data_dicts = {}
with open(full_path, 'r') as f:
    for line in f:
        line = line.strip()
        if not line or ':' not in line:
            continue
        var_name, dict_str = line.split(': ', 1)
        data_dicts[var_name.strip()] = ast.literal_eval(dict_str.strip())

# Извлечение данных
all_actions = data_dicts['all actions']
correct_predicate = data_dicts['correct predicate']
incorrect_try = data_dicts['incorrect try predicate this']
incorrect_result = data_dicts['incorrect result predicate this']
actions_nearest = data_dicts['actions by nearest players count']
correct_nearest = data_dicts['correct predicate by nearest players count']
action_seen_enemies = data_dicts['actions by seen enemies']
correct_seen_enemies = data_dicts['correct predicate by seen enemies']

all_actions.pop("fight", None)
all_actions.pop("kickingg", None)
correct_predicate.pop("fight", None)
correct_predicate.pop("kickingg", None)
incorrect_try.pop("fight", None)
incorrect_try.pop("kickingg", None)
incorrect_result.pop("fight", None)
incorrect_result.pop("kickingg", None)
# Общие настройки стиля
plt.rcParams.update({
    'figure.figsize': (10, 6),
    'grid.linestyle': '--',
    'grid.alpha': 0.7,
    'axes.edgecolor': 'black',
    'axes.linewidth': 0.8
})

# Функция для создания точечных графиков
def create_scatter_plot(x, y, keys, title, ylabel, marker):
    plt.figure()
    plt.scatter(x, y, marker=marker, s=100, facecolors='none', edgecolors='black', linewidths=2)
    plt.xticks(x, keys, rotation=45, ha='right')
    plt.ylim(0, 1.1)
    plt.title(title)
    plt.ylabel(ylabel)
    plt.grid(True)
    plt.tight_layout()
    plt.show()

# Создание графиков
keys = list(all_actions.keys())
x = range(len(keys))

create_scatter_plot(x, [correct_predicate[k]/all_actions[k] if all_actions[k] else 0 for k in keys],
                   keys, 'Процент коррктных предсказаний', 'Предсказания (Корректные/Все)', 'o')

create_scatter_plot(x, [incorrect_try[k]/all_actions[k] if all_actions[k] else 0 for k in keys],
                   keys, 'Не предсказанные действия', 'Предсказания (Непредсказанные/Все)', 's')

create_scatter_plot(x, [incorrect_result[k]/all_actions[k] if all_actions[k] else 0 for k in keys],
                   keys, 'Неправильно предсказанные действия', 'Предсказания (Неправильные/Все)', '^')

# График для nearest players
keys_nearest = sorted(actions_nearest.keys())
ratios = [correct_nearest[k]/actions_nearest[k] if actions_nearest[k] else 0 for k in keys_nearest]

plt.figure()
plt.plot(keys_nearest, ratios, marker='o', markersize=8, linestyle='--',
         markerfacecolor='none', markeredgecolor='black', color='black')
plt.xticks(keys_nearest)
plt.ylim(0, 1.1)
plt.title('Процент предсказаний по количеству игроков рядом с мячом')
plt.xlabel('Количество ближайших игроков')
plt.ylabel('Предсказания (Правильные/Все)')
plt.grid(True)
plt.tight_layout()
plt.show()

# График для seen enemies
keys_seen = sorted(action_seen_enemies.keys())
ratios = [correct_seen_enemies[k]/action_seen_enemies[k] if action_seen_enemies[k] else 0 for k in keys_seen]

plt.figure()
plt.plot(keys_seen, ratios, marker='o', markersize=8, linestyle='--',
         markerfacecolor='none', markeredgecolor='black', color='black')
plt.xticks(keys_seen)
plt.ylim(0, 1.1)
plt.title('Процент предсказаний по количеству видимых игроков соперника')
plt.xlabel('Количество видимых игроков')
plt.ylabel('Предсказания (Правильные/Все)')
plt.grid(True)
plt.tight_layout()
plt.show()
