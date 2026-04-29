from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from typing import Iterable


BNF_GRAMMAR = """
<program>    ::= <identifier> "=" <expression>
<expression> ::= <term> (("+" | "-") <term>)*
<term>       ::= <power> (("*" | "/") <power>)*
<power>      ::= <factor> ("pangkat" <factor>)*
<factor>     ::= <number> | <identifier> | "(" <expression> ")"
""".strip()


CFG_GRAMMAR = """
Program    -> Identifier '=' Expression
Expression -> Term ExpressionTail
ExpressionTail -> ('+' | '-') Term ExpressionTail | epsilon
Term       -> Power TermTail
TermTail   -> ('*' | '/') Power TermTail | epsilon
Power      -> Factor PowerTail
PowerTail  -> 'pangkat' Factor PowerTail | epsilon
Factor     -> Number | Identifier | '(' Expression ')'
""".strip()


@dataclass(frozen=True)
class Token:
    type: str
    value: str

    def to_dict(self) -> dict[str, str]:
        return {"type": self.type, "value": self.value}


@dataclass(frozen=True)
class NumberNode:
    value: float


@dataclass(frozen=True)
class VariableNode:
    name: str


@dataclass(frozen=True)
class BinaryOpNode:
    operator: str
    left: AstNode
    right: AstNode


@dataclass(frozen=True)
class AssignmentNode:
    target: str
    expression: AstNode


AstNode = NumberNode | VariableNode | BinaryOpNode


class Lexer:
    KEYWORDS = {"pangkat": "POWER"}
    SINGLE_CHAR_TOKENS = {
        "=": "ASSIGN",
        "+": "PLUS",
        "-": "MINUS",
        "*": "MULTIPLY",
        "/": "DIVIDE",
        "^": "POWER",
        "(": "LPAREN",
        ")": "RPAREN",
    }

    def __init__(self, source: str) -> None:
        self.source = source
        self.position = 0

    def tokenize(self) -> list[Token]:
        tokens: list[Token] = []

        while self.position < len(self.source):
            current = self.source[self.position]

            if current.isspace():
                self.position += 1
                continue

            if current.isdigit() or current == ".":
                tokens.append(self._read_number())
                continue

            if current.isalpha():
                tokens.append(self._read_word())
                continue

            if current in self.SINGLE_CHAR_TOKENS:
                token_type = self.SINGLE_CHAR_TOKENS[current]
                tokens.append(Token(token_type, current))
                self.position += 1
                continue

            raise SyntaxError(f"Karakter tidak dikenal: {current!r}")

        tokens.append(Token("EOF", ""))
        return self._insert_implicit_multiplication(tokens)

    def _read_number(self) -> Token:
        start = self.position
        dot_count = 0

        while self.position < len(self.source):
            current = self.source[self.position]

            if current == ".":
                dot_count += 1
                if dot_count > 1:
                    raise SyntaxError("Format angka tidak valid")
            elif not current.isdigit():
                break

            self.position += 1

        value = self.source[start:self.position]
        if value == ".":
            raise SyntaxError("Format angka tidak valid")

        return Token("NUMBER", value)

    def _read_word(self) -> Token:
        start = self.position

        while self.position < len(self.source) and self.source[self.position].isalnum():
            self.position += 1

        word = self.source[start:self.position].lower()
        token_type = self.KEYWORDS.get(word, "IDENTIFIER")
        return Token(token_type, word)

    def _insert_implicit_multiplication(self, tokens: list[Token]) -> list[Token]:
        result: list[Token] = []
        left_types = {"NUMBER", "IDENTIFIER", "RPAREN"}
        right_types = {"NUMBER", "IDENTIFIER", "LPAREN"}

        for current, next_token in zip(tokens, tokens[1:]):
            result.append(current)
            if current.type in left_types and next_token.type in right_types:
                result.append(Token("MULTIPLY", "*"))

        result.append(tokens[-1])
        return result


class Parser:
    def __init__(self, tokens: list[Token]) -> None:
        self.tokens = tokens
        self.position = 0

    def parse(self) -> AssignmentNode:
        assignment = self._parse_assignment()
        self._consume("EOF")
        return assignment

    def _parse_assignment(self) -> AssignmentNode:
        target = self._consume("IDENTIFIER").value
        self._consume("ASSIGN")
        expression = self._parse_expression()
        return AssignmentNode(target, expression)

    def _parse_expression(self) -> AstNode:
        node = self._parse_term()

        while self._current().type in {"PLUS", "MINUS"}:
            operator = self._advance().value
            right = self._parse_term()
            node = BinaryOpNode(operator, node, right)

        return node

    def _parse_term(self) -> AstNode:
        node = self._parse_power()

        while self._current().type in {"MULTIPLY", "DIVIDE"}:
            operator = self._advance().value
            right = self._parse_power()
            node = BinaryOpNode(operator, node, right)

        return node

    def _parse_power(self) -> AstNode:
        node = self._parse_factor()

        if self._current().type == "POWER":
            self._advance()
            right = self._parse_power()
            node = BinaryOpNode("pangkat", node, right)

        return node

    def _parse_factor(self) -> AstNode:
        current = self._current()

        if current.type == "MINUS":
            self._advance()
            return BinaryOpNode("*", NumberNode(-1), self._parse_factor())

        if current.type == "NUMBER":
            self._advance()
            return NumberNode(float(current.value))

        if current.type == "IDENTIFIER":
            self._advance()
            return VariableNode(current.value)

        if current.type == "LPAREN":
            self._advance()
            expression = self._parse_expression()
            self._consume("RPAREN")
            return expression

        raise SyntaxError(f"Token tidak valid pada factor: {current}")

    def _current(self) -> Token:
        return self.tokens[self.position]

    def _advance(self) -> Token:
        token = self._current()
        self.position += 1
        return token

    def _consume(self, expected_type: str) -> Token:
        current = self._current()

        if current.type != expected_type:
            raise SyntaxError(
                f"Expected token {expected_type}, tetapi mendapatkan {current.type}"
            )

        return self._advance()


class SemanticAnalyzer:
    def __init__(self, known_variables: Iterable[str]) -> None:
        self.known_variables = set(known_variables)

    def analyze(self, node: AssignmentNode) -> str:
        if node.target != "y":
            raise ValueError("Variabel output harus y")

        self._check_expression(node.expression)
        return "Valid: assignment ke y benar, variabel x dikenali, dan operator valid."

    def _check_expression(self, node: AstNode) -> None:
        if isinstance(node, NumberNode):
            return

        if isinstance(node, VariableNode):
            if node.name not in self.known_variables:
                raise ValueError(f"Variabel belum dideklarasikan: {node.name}")
            return

        if isinstance(node, BinaryOpNode):
            if node.operator not in {"+", "-", "*", "/", "pangkat"}:
                raise ValueError(f"Operator tidak valid: {node.operator}")
            self._check_expression(node.left)
            self._check_expression(node.right)
            return

        raise TypeError(f"Node AST tidak dikenal: {node}")


class Evaluator:
    def evaluate(self, assignment: AssignmentNode, x_value: float) -> float:
        environment = {"x": x_value}
        return self._evaluate_node(assignment.expression, environment)

    def _evaluate_node(self, node: AstNode, environment: dict[str, float]) -> float:
        if isinstance(node, NumberNode):
            return node.value

        if isinstance(node, VariableNode):
            return environment[node.name]

        if isinstance(node, BinaryOpNode):
            left = self._evaluate_node(node.left, environment)
            right = self._evaluate_node(node.right, environment)

            if node.operator == "+":
                return left + right
            if node.operator == "-":
                return left - right
            if node.operator == "*":
                return left * right
            if node.operator == "/":
                if right == 0:
                    raise ZeroDivisionError("Pembagian dengan nol saat execution")
                return left / right
            if node.operator == "pangkat":
                return left**right

        raise TypeError(f"Node AST tidak dapat dievaluasi: {node}")


def ast_to_text(node: AssignmentNode | AstNode, level: int = 0) -> str:
    indent = "  " * level

    if isinstance(node, AssignmentNode):
        return (
            f"{indent}Assignment(target={node.target})\n"
            f"{ast_to_text(node.expression, level + 1)}"
        )

    if isinstance(node, BinaryOpNode):
        return (
            f"{indent}BinaryOp(operator={node.operator})\n"
            f"{ast_to_text(node.left, level + 1)}\n"
            f"{ast_to_text(node.right, level + 1)}"
        )

    if isinstance(node, VariableNode):
        return f"{indent}Variable(name={node.name})"

    if isinstance(node, NumberNode):
        return f"{indent}Number(value={_clean_number(node.value)})"

    raise TypeError(f"Node AST tidak dikenal: {node}")


def ast_to_expression(node: AstNode) -> str:
    if isinstance(node, NumberNode):
        return str(_clean_number(node.value))

    if isinstance(node, VariableNode):
        return node.name

    if isinstance(node, BinaryOpNode):
        operator = "**" if node.operator == "pangkat" else node.operator
        left = ast_to_expression(node.left)
        right = ast_to_expression(node.right)
        return f"({left} {operator} {right})"

    raise TypeError(f"Node AST tidak dikenal: {node}")


def generated_code_text(assignment: AssignmentNode) -> str:
    expression = ast_to_expression(assignment.expression)
    return f"def compiled_function(x):\n    return {expression}"


def compile_source(source_code: str, x_start: int = 0, x_end: int = 10) -> dict:
    source_code = (source_code or "").strip()
    if not source_code:
        raise ValueError("Source code tidak boleh kosong")

    try:
        start = int(x_start)
        end = int(x_end)
    except (TypeError, ValueError) as exc:
        raise ValueError("Range x harus berupa angka bulat") from exc

    if end < start:
        raise ValueError("x_end harus lebih besar atau sama dengan x_start")

    if end - start > 200:
        raise ValueError("Range x maksimal 200 langkah agar execution tetap ringan")

    tokens = Lexer(source_code).tokenize()
    ast = Parser(tokens).parse()
    semantic_message = SemanticAnalyzer(known_variables={"x"}).analyze(ast)

    evaluator = Evaluator()
    execution: list[dict[str, int | float]] = []

    for x_value in range(start, end + 1):
        y_value = evaluator.evaluate(ast, x_value)
        if not isfinite(y_value):
            raise ArithmeticError("Hasil execution tidak finite")
        execution.append({"x": x_value, "y": _clean_number(y_value)})

    return {
        "success": True,
        "source_code": source_code,
        "bnf": BNF_GRAMMAR,
        "cfg": CFG_GRAMMAR,
        "tokens": [token.to_dict() for token in tokens if token.type != "EOF"],
        "ast": ast_to_text(ast),
        "semantic": semantic_message,
        "generated_code": generated_code_text(ast),
        "execution": execution,
    }


def _clean_number(value: float) -> int | float:
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value
