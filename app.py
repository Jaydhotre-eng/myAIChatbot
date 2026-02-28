import streamlit as st

# Title
st.title("My Chatbot 🤖")

# Chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display previous messages
for msg in st.session_state.messages:
    st.write(msg)

# User input
user_input = st.text_input("Ask something:")

if user_input:
    # Store user message
    st.session_state.messages.append("You: " + user_input)

    # Simple bot reply (you can replace later)
    response = "I received: " + user_input

    # Store bot response
    st.session_state.messages.append("Bot: " + response)

    # Refresh UI
    st.rerun()