```python
class MyClass:
	def __enter__(self):
		print("컨텍스트에 진입했습니다.")
		return self  # 객체 자신을 반환

	def __exit__(self, exc_type, exc_value, traceback):
		print("컨텍스트를 벗어났습니다.")

	def do_something(self):
		print("작업을 수행합니다.")

# with 구문에서 객체를 사용
with MyClass() as obj:
	obj.do_something()
	
	

컨텍스트에 진입했습니다.
작업을 수행합니다.
컨텍스트를 벗어났습니다.
```