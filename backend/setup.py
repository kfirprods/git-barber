from setuptools import setup

setup(
    name='git-barber',
    version='0.1.0',
    py_modules=['splitty'],
    install_requires=[
        'click',
        'GitPython',
        'inquirer',
    ],
    entry_points='''
        [console_scripts]
        git-barber=splitty:main
    ''',
)